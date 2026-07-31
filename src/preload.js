const { contextBridge, ipcRenderer } = require('electron')
const channels = require('./ipc-channels.js')

contextBridge.exposeInMainWorld('bloskyAPI', {
    getAllSyntaxes: () => ipcRenderer.invoke(channels.GET_ALL_SYNTAXES),
    openProject: () => ipcRenderer.invoke(channels.OPEN_PROJECT),
    saveProject: (project, path) => ipcRenderer.invoke(channels.SAVE_PROJECT, project, path),
    saveProjectAs: (project) => ipcRenderer.invoke(channels.SAVE_PROJECT_AS, project),
    getPath: () => ipcRenderer.invoke(channels.GET_PATH),
    setPath: (path) => ipcRenderer.invoke(channels.SET_PATH, path),
    getCode: () => ipcRenderer.invoke(channels.GET_CODE),
    setCode: (code) => ipcRenderer.invoke(channels.SET_CODE, code),
    getSetting: (key) => ipcRenderer.invoke(channels.GET_SETTING, key),
    setSetting: (key, value) => ipcRenderer.invoke(channels.SET_SETTING, key, value),
    clearStorage: () => ipcRenderer.invoke(channels.CLEAR_STORAGE),
    setUnsavedModifications: (value) => ipcRenderer.invoke(channels.SET_UNSAVED_MODIFICATIONS, value),
    exportProject: (workspace, settings) => ipcRenderer.invoke(channels.EXPORT_PROJECT, workspace, settings)
})
