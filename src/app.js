const fs = require('fs')
const {app, BrowserWindow} = require('electron')

global.settings = {
    "name": null,
    "version": null,
    "author": null,
    "description": null
}

global.code = { //TODO: Make this cleaner
    "code": null
}

global.path = { //TODO: Make this cleaner
    "path": null 
}

function createWindow() {
    const win = new BrowserWindow({
        icon: app.getAppPath() + "/resources/icon.png",
        width: 1800,
        height: 1200,
        minHeight: 600,
        minWidth: 800,
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.loadFile(app.getAppPath() + '/src/pages/index.html')
    win.setMenuBarVisibility(false)
    
    win.on('close', function(e) {
        
        //TODO: it currently only works if the changes has been cached to the global storage
        //TODO: Implement this for Switch workspace too
        if(!win.webContents.getURL().endsWith("index.html")) {
            //If it's a new unsaved project
            if(global.path.path == null) { //TODO: check if modifications has been made
                const choice = require("electron").dialog.showMessageBoxSync(this,
                    {
                        type: "warning",
                        buttons: ["Quit", "Cancel"], //TODO: add Save button
                        title: "Confirm closing",
                        message: "You have unsaved changes"
                    }) 
                switch(choice) {
                    case 1:
                        e.preventDefault() 
                        break
                    
                    /*
                    Doesn't work without canceling the event
                    case 0 :
                        //Cannot use the saveProjectAs as it only works from the renderer process
                        const { dialog } = require('electron')
                        var options = {
                            title: "Save project",
                            buttonLabel: "Save project",
                            filters: [{
                                name: 'Blosky Projects',
                                extensions: ['bsk']
                            }]
                        }
                        dialog.showSaveDialog(options).then(result => {
                            if (result.canceled == false) {
                                setPath(result.filePath)
                                fs.writeFile(result.filePath, project, function(err) {
                                    if (err) throw err
                                })
                            }
                        })
                    break
                    */

                }
            } else { //If it's not a new project which has unsaved modifications
                const lines = fs.readFileSync(global.path.path, "utf-8").split("\r")

                //stringify & parse is needed or the comparaison won't work
                if(global.code.code != lines[1] || JSON.stringify(JSON.parse(lines[0])) != JSON.stringify(global.settings)) { 
                    const choice = require("electron").dialog.showMessageBoxSync(this,
                        {
                            type: "warning",
                            buttons: ["Save", "Don't save", "Cancel"],
                            title: "Confirm closing",
                            message: "You have unsaved changes"
                        }) 
                    switch(choice) {
                        case 0:
                            saveProject(JSON.stringify(global.settings) + "\r" + global.code.code, global.path.path)
                            break

                        case 2:
                            e.preventDefault()
                            break
                    }
                }
            }
        }
    }) 
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

function getAllSyntaxes() {
    const appPath = require('electron').remote.app.getAppPath()
    
    return {
        events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
        effects: JSON.parse(fs.readFileSync(appPath+ "/src/transpiler/syntaxes/effects.json")),
        expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
        conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
    } 
}

function openProject() {
    const dialog = require('electron').remote.dialog
    const options = {
        properties: ['openFile'],
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    dialog.showOpenDialog(options).then(result => {
        if (result.canceled == false) {
            const lines = fs.readFileSync(result.filePaths[0], "utf-8").split("\r")
            const settings = JSON.parse(lines[0])
            setCode(lines[1])
            setSettings("name", settings["name"])
            setSettings("version", settings["version"])
            setSettings("author", settings["author"])
            setSettings("description", settings["description"])
            setPath(result.filePaths[0])
            window.location.replace("plugin_config.html")
        }
    })
}

function saveProject(project, path) {
    if (path == null) {
        saveProjectAs(project)
    } else {
        fs.writeFile(path, project, function(err) {
            if (err) throw err
        })
    }
}

function saveProjectAs(project) {
    const dialog = require('electron').remote.dialog
    const options = {
        title: "Save project",
        buttonLabel: "Save project",
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    dialog.showSaveDialog(options).then(result => {
        if (result.canceled == false) {
            setPath(result.filePath)
            fs.writeFile(result.filePath, project, function(err) {
                if (err) throw err
            })
        }
    })
}

function setPath(value){
    require('electron').remote.getGlobal('path').path = value
}

function getPath(){
    return require('electron').remote.getGlobal('path').path
}

function setCode(value) {
    require('electron').remote.getGlobal('code').code = value
}

function getCode() {
    return require('electron').remote.getGlobal('code').code
}

function setSettings(key, value) {
    require('electron').remote.getGlobal('settings')[key] = value
}

function getSettings(key) {
    return require('electron').remote.getGlobal('settings')[key]
}

function clearStorage() { //TODO: find a cleaner way to do that
    require('electron').remote.getGlobal('code').code = null
    require('electron').remote.getGlobal('path').path = null
    require('electron').remote.getGlobal('settings').name = null
    require('electron').remote.getGlobal('settings').version = null
    require('electron').remote.getGlobal('settings').author = null
    require('electron').remote.getGlobal('settings').description = null
}