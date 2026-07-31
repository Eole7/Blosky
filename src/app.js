const fs = require('fs')
const path = require('path')
const {app, BrowserWindow, ipcMain, dialog} = require('electron')

global.settings = { //Global app storage: can be accessed from both main and renderer process
    "name": null,
    "version": null,
    "author": null,
    "description": null
}

global.workspace = {
    "code": null,
    "path": null,
    "has_unsaved_modifications": false
}

function createWindow() {
    const window = new BrowserWindow({
        icon: app.getAppPath() + "/resources/icon.png",
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    window.loadFile(app.getAppPath() + '/src/pages/index.html')
    window.setMenuBarVisibility(false)
    
    function checkUnsavedModifications(event) {
        if(global.workspace.has_unsaved_modifications) {
            const choice = dialog.showMessageBoxSync(window,
                {
                    type: "warning",
                    buttons: ["Save", "Don't save", "Cancel"],
                    title: "Confirm closing",
                    message: "You have unsaved changes"
                })
            switch (choice) {
                case 0: //If the user clicked on Save
                    let savePath;
                    if(global.workspace.path != null) { //If it's an existing project
                        savePath = global.workspace.path
                    } else { //If it's a new project, we ask the user for the path
                        const options = {
                            title: "Save Project",
                            buttonLabel: "Save Project",
                            filters: [{
                                name: 'Blosky Projects',
                                extensions: ['bsk']
                            }]
                        }
                        savePath = dialog.showSaveDialogSync(window, options)
                        if(savePath == undefined) { //If the user canceled saving
                            event.preventDefault()
                            return
                        }
                    }
                    fs.writeFileSync(savePath, (JSON.stringify(global.settings) + "\r" + global.workspace.code))
                    break
                
                case 2: //If the user clicked on Cancel
                    event.preventDefault()
                    break
            }
        }
    }
    
    window.on('close', checkUnsavedModifications)
    window.webContents.on("will-navigate", (event, url) => {
        if(url.endsWith("index.html")) { //When the user clicks on "Switch Workspace"
            checkUnsavedModifications(event)
        }
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

const appPath = app.getAppPath()

function getAllSyntaxes() {
    return {
        events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
        commands: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/commands.json")),
        effects: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/effects.json")),
        expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
        conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
        loops: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/loops.json"))
    } 
}

async function openProject() {
    const options = {
        properties: ['openFile'],
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    const result = await dialog.showOpenDialog(options)
    if(result.canceled == false) {
        const lines = fs.readFileSync(result.filePaths[0], "utf-8").split("\r")
        const settings = JSON.parse(lines[0])
        setCode(lines[1])
        setSetting("name", settings["name"])
        setSetting("version", settings["version"])
        setSetting("author", settings["author"])
        setSetting("description", settings["description"])
        setPath(result.filePaths[0])
        return { canceled: false, path: result.filePaths[0], settings, code: lines[1] }
    }
    return { canceled: true }
}

function saveProject(project, path) {
    if(path == null) {
        return saveProjectAs(project)
    } else {
        fs.writeFileSync(path, project)
        setUnsavedModifications(false)
        return { success: true }
    }
}

async function saveProjectAs(project) {
    const options = {
        title: "Save Project",
        buttonLabel: "Save Project",
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    const result = await dialog.showSaveDialog(options)
    if(result.canceled == false) {
        setPath(result.filePath)
        fs.writeFileSync(result.filePath, project)
        setUnsavedModifications(false)
        return { canceled: false, path: result.filePath }
    }
    setUnsavedModifications(false)
    return { canceled: true }
}

function setPath(value){
    global.workspace.path = value
}

function getPath(){
    return global.workspace.path
}

function setCode(value) {
    global.workspace.code = value
}

function getCode() {
    return global.workspace.code
}

function setSetting(key, value) {
    global.settings[key] = value
}

function getSetting(key) {
    return global.settings[key]
}

function clearStorage() {
    global.workspace.code = null
    global.settings.name = null
    global.settings.version = null
    global.settings.author = null
    global.settings.description = null
    global.workspace.path = null
    global.workspace.has_unsaved_modifications = false
}

function setUnsavedModifications(boolean) {
    global.workspace.has_unsaved_modifications = boolean
}

const channels = require('./ipc-channels')

ipcMain.handle(channels.GET_ALL_SYNTAXES, () => getAllSyntaxes())
ipcMain.handle(channels.OPEN_PROJECT, async () => openProject())
ipcMain.handle(channels.SAVE_PROJECT, async (_, project, path) => saveProject(project, path))
ipcMain.handle(channels.SAVE_PROJECT_AS, async (_, project) => saveProjectAs(project))
ipcMain.handle(channels.GET_PATH, () => getPath())
ipcMain.handle(channels.SET_PATH, (_, path) => setPath(path))
ipcMain.handle(channels.GET_CODE, () => getCode())
ipcMain.handle(channels.SET_CODE, (_, code) => setCode(code))
ipcMain.handle(channels.GET_SETTING, (_, key) => getSetting(key))
ipcMain.handle(channels.SET_SETTING, (_, key, value) => setSetting(key, value))
ipcMain.handle(channels.CLEAR_STORAGE, () => clearStorage())
ipcMain.handle(channels.SET_UNSAVED_MODIFICATIONS, (_, value) => setUnsavedModifications(value))
ipcMain.handle(channels.EXPORT_PROJECT, async (_, workspace, settings) => {
    const { workspaceToSyntaxTrees } = require('./transpiler/bridge-logic.js')
    const { Transpiler } = require('./transpiler/transpiler.js')
    
    const syntax_tree = workspaceToSyntaxTrees(workspace)
    const transpiler = new Transpiler(syntax_tree.listeners, syntax_tree.commands, settings)
    transpiler.clearTemporaryFolder()
    transpiler.generateListenersClass()
    transpiler.generateCommandsClass()
    transpiler.generateMainClass()
    transpiler.generatePluginConfig()
    
    try {
        const result = await dialog.showSaveDialog({ title: "Save plugin", buttonLabel: "Save plugin" })
        if(result.canceled === false) {
            transpiler.compile(result.filePath)
            return { success: true, path: result.filePath }
        }
        return { canceled: true }
    } finally {
        transpiler.clearTemporaryFolder()
    }
})
