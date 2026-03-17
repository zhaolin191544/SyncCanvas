'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'zh' | 'en'

const translations = {
  zh: {
    dashboard: '仪表盘',
    myBoards: '我的画板',
    joinedRecently: '最近加入',
    createBoard: '新建画板',
    joinBoard: '加入画板',
    logout: '退出登录',
    roomID: '房间 ID',
    password: '密码',
    cancel: '取消',
    create: '创建',
    join: '加入',
    owner: '拥有者',
    collaborator: '协作者',
    shortcuts: '快捷键',
    layers: '图层',
    presentation: '演示模式',
    exitPresentation: '退出演示',
    zoom: '缩放',
    ready: '就绪',
    drawing: '正在绘制',
    selected: '个已选中',
    name: '名称',
    stroke: '描边',
    fill: '填充',
    width: '宽度',
    opacity: '透明度',
    size: '大小',
    position: '位置',
    dimensions: '尺寸',
    noElements: '暂无元素',
    enterPassword: '输入房间密码',
    setRoomPassword: '设置房间密码',
    tools: {
      select: '选择',
      rectangle: '矩形',
      ellipse: '椭圆',
      line: '直线',
      arrow: '箭头',
      freehand: '画笔',
      text: '文本',
      image: '图片',
      eraser: '橡皮擦',
    }
  },
  en: {
    dashboard: 'Dashboard',
    myBoards: 'My Boards',
    joinedRecently: 'Joined Recently',
    createBoard: 'New Board',
    joinBoard: 'Join Board',
    logout: 'Log out',
    roomID: 'Room ID',
    password: 'Password',
    cancel: 'Cancel',
    create: 'Create',
    join: 'Join',
    owner: 'Owner',
    collaborator: 'Collaborator',
    shortcuts: 'Shortcuts',
    layers: 'Layers',
    presentation: 'Presentation',
    exitPresentation: 'Exit',
    zoom: 'Zoom',
    ready: 'Ready',
    drawing: 'Drawing',
    selected: 'selected',
    name: 'Name',
    stroke: 'Stroke',
    fill: 'Fill',
    width: 'Width',
    opacity: 'Opacity',
    size: 'Size',
    position: 'Position',
    dimensions: 'Dimensions',
    noElements: 'No elements',
    enterPassword: 'Enter room password',
    setRoomPassword: 'Set room password',
    tools: {
      select: 'Select',
      rectangle: 'Rectangle',
      ellipse: 'Ellipse',
      line: 'Line',
      arrow: 'Arrow',
      freehand: 'Pencil',
      text: 'Text',
      image: 'Image',
      eraser: 'Eraser',
    }
  }
}

type Translations = typeof translations.en

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language
    if (saved && (saved === 'zh' || saved === 'en')) {
      setLanguage(saved)
    } else {
      const browserLang = navigator.language.split('-')[0]
      if (browserLang === 'zh') setLanguage('zh')
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
