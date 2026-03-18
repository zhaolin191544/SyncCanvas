import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export interface SupabaseProviderConfig {
  channel: string
  roomId: string // Must be the same as the ID in the 'Room' table
  awareness?: Awareness
  saveInterval?: number // Interval in ms to save to DB (default: 5000)
}

type EventHandler = (...args: any[]) => void;

export class SupabaseProvider {
  doc: Y.Doc
  awareness: Awareness
  channel: RealtimeChannel | null = null
  supabase: SupabaseClient
  config: SupabaseProviderConfig
  connected: boolean = false
  private _listeners: Map<string, Set<EventHandler>> = new Map()
  private _saveTimeout: any = null
  private _isDestroyed: boolean = false
  
  constructor(doc: Y.Doc, supabase: SupabaseClient, config: SupabaseProviderConfig) {
    this.doc = doc
    this.supabase = supabase
    this.config = config
    this.awareness = config.awareness || new Awareness(doc)

    this.onDocumentUpdate = this.onDocumentUpdate.bind(this)
    this.onAwarenessUpdate = this.onAwarenessUpdate.bind(this)

    this.doc.on('update', this.onDocumentUpdate)
    this.awareness.on('update', this.onAwarenessUpdate)

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.removeSelfFromAwarenessOnUnload.bind(this))
    }

    this.connect()
    this.initialFetch()
  }

  on(eventName: string, handler: EventHandler) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set())
    }
    this._listeners.get(eventName)!.add(handler)
  }

  off(eventName: string, handler: EventHandler) {
    if (this._listeners.has(eventName)) {
      this._listeners.get(eventName)!.delete(handler)
    }
  }

  emit(eventName: string, ...args: any[]) {
    if (this._listeners.has(eventName)) {
      for (const handler of this._listeners.get(eventName)!) {
        handler(...args)
      }
    }
  }

  private async initialFetch() {
    try {
      const { data, error } = await this.supabase
        .from('Room')
        .select('content')
        .eq('id', this.config.roomId)
        .single()

      if (error) {
        console.error('Failed to fetch initial room content:', error)
        return
      }

      if (data?.content) {
        // Base64 or ByteA handled by supabase-js
        // If ByteA, it might come back as hex string or ArrayBuffer
        let uint8;
        if (typeof data.content === 'string') {
           // Postgrest might return hex string for bytea
           const hex = data.content.startsWith('\\x') ? data.content.substring(2) : data.content;
           uint8 = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        } else {
           uint8 = new Uint8Array(data.content);
        }
        
        if (uint8.length > 0) {
          Y.applyUpdate(this.doc, uint8, 'initial-fetch')
        }
      }
    } catch (e) {
      console.error('Error during initial fetch:', e)
    }
  }

  async saveToDatabase() {
    if (this._isDestroyed) return;
    
    try {
      const content = Y.encodeStateAsUpdate(this.doc)
      // We convert to hex for PostgreSQL bytea if necessary, or let supabase-js handle it
      // Supabase-js usually handles Uint8Array -> bytea correctly
      const { error } = await this.supabase
        .from('Room')
        .update({ content: Array.from(content) })
        .eq('id', this.config.roomId)

      if (error) {
        console.error('Failed to save room content:', error)
      }
    } catch (e) {
      console.error('Error during save:', e)
    }
  }

  connect() {
    if (this.channel) return

    this.channel = this.supabase.channel(this.config.channel, {
      config: {
        broadcast: { ack: false }
      }
    })
    
    this.channel
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        const update = new Uint8Array(payload.update)
        Y.applyUpdate(this.doc, update, this)
      })
      .on('broadcast', { event: 'awareness' }, ({ payload }) => {
        const update = new Uint8Array(payload.update)
        applyAwarenessUpdate(this.awareness, update, this)
      })
      .on('broadcast', { event: 'request-sync' }, () => {
        const state = Y.encodeStateAsUpdate(this.doc)
        this.channel?.send({
          type: 'broadcast',
          event: 'update',
          payload: { update: Array.from(state) }
        })

        if (this.awareness.getLocalState() !== null) {
          const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
          this.channel?.send({
            type: 'broadcast',
            event: 'awareness',
            payload: { update: Array.from(awarenessUpdate) }
          })
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.connected = true
          this.emit('status', [{ status: 'connected' }])
          this.emit('sync', true)
          
          this.channel?.send({
            type: 'broadcast',
            event: 'request-sync',
            payload: {}
          })
          
          if (this.awareness.getLocalState() !== null) {
            const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
            this.channel?.send({
              type: 'broadcast',
              event: 'awareness',
              payload: { update: Array.from(awarenessUpdate) }
            })
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connected = false
          this.emit('status', [{ status: 'disconnected' }])
          this.emit('sync', false)
        }
      })
  }

  onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin === 'initial-fetch') return;

    if (origin !== this && this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'update',
        payload: { update: Array.from(update) }
      })

      // Schedule a save to DB (debounced)
      if (this._saveTimeout) clearTimeout(this._saveTimeout);
      this._saveTimeout = setTimeout(() => {
        this.saveToDatabase();
      }, this.config.saveInterval || 5000);
    }
  }

  onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
    if (origin !== this && this.channel) {
      const changedClients = added.concat(updated).concat(removed)
      const update = encodeAwarenessUpdate(this.awareness, changedClients)
      this.channel.send({
        type: 'broadcast',
        event: 'awareness',
        payload: { update: Array.from(update) }
      })
    }
  }

  removeSelfFromAwarenessOnUnload() {
    removeAwarenessStates(this.awareness, [this.doc.clientID], 'window unload')
  }

  disconnect() {
    if (this.channel) {
      this.removeSelfFromAwarenessOnUnload()
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.connected = false
    this.emit('status', [{ status: 'disconnected' }])
  }

  destroy() {
    this._isDestroyed = true;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this.saveToDatabase(); // Final save
    
    this.doc.off('update', this.onDocumentUpdate)
    this.awareness.off('update', this.onAwarenessUpdate)
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.removeSelfFromAwarenessOnUnload.bind(this))
    }
    this.disconnect()
  }
}
