import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

export interface SupabaseProviderConfig {
  channel: string
  awareness?: Awareness
  resyncInterval?: number | false
}

// Simple event emitter implementation for the provider
type EventHandler = (...args: any[]) => void;

export class SupabaseProvider {
  doc: Y.Doc
  awareness: Awareness
  channel: RealtimeChannel | null = null
  supabase: SupabaseClient
  config: SupabaseProviderConfig
  connected: boolean = false
  private _listeners: Map<string, Set<EventHandler>> = new Map()
  
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
        // Send our state vector so the requester can sync
        const state = Y.encodeStateAsUpdate(this.doc)
        this.channel?.send({
          type: 'broadcast',
          event: 'update',
          payload: { update: Array.from(state) }
        })

        // Also broadcast awareness state
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
          
          // Request current state from other peers
          this.channel?.send({
            type: 'broadcast',
            event: 'request-sync',
            payload: {}
          })
          
          // Broadcast our local awareness
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
    if (origin !== this && this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'update',
        payload: { update: Array.from(update) }
      })
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
    this.doc.off('update', this.onDocumentUpdate)
    this.awareness.off('update', this.onAwarenessUpdate)
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.removeSelfFromAwarenessOnUnload.bind(this))
    }
    this.disconnect()
  }
}
