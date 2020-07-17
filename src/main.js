const fs = require('fs')
const {
    app,
    BrowserWindow
} = require('electron')

function createWindow() {
    const win = new BrowserWindow({
        icon:  app.getAppPath() + "/src/UI/images/icon.png",
        width: 1800,
        height: 1200,
        minHeight: 800,
        minWidth: 1000,
        webPreferences: {
            nodeIntegration: true
        }
    })
    win.loadFile(app.getAppPath() + '/src/UI/pages/index.html')
    win.setMenuBarVisibility(false)
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
    let app = require('electron').remote.app
    let path = app.getAppPath()
    while(path.includes("\\")) path = path.replace("\\", "/")
    
    return {
        events: JSON.parse(fs.readFileSync(path + "/src/transpiler/syntaxes/events.json")),
        effects: JSON.parse(fs.readFileSync(path + "/src/transpiler/syntaxes/effects.json")),
        expressions: JSON.parse(fs.readFileSync(path + "/src/transpiler/syntaxes/expressions.json")),
        conditions: JSON.parse(fs.readFileSync(path + "/src/transpiler/syntaxes/conditions.json")),
    } 
}

function openProject() {
    const dialog = require('electron').remote.dialog
    var options = {
        properties: ['openFile'],
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    dialog.showOpenDialog(options).then(result => {
        if (result.canceled == false) {
            var lines = fs.readFileSync(result.filePaths[0], "utf-8").split("\r")
            var settings = JSON.parse(lines[0])
            sessionStorage.setItem("code", lines[1])
            sessionStorage.setItem("name", settings["name"])
            sessionStorage.setItem("version", settings["version"])
            sessionStorage.setItem("author", settings["author"])
            sessionStorage.setItem("description", settings["description"])
            sessionStorage.setItem("path", result.filePaths[0])
            window.location.replace("settings.html")
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
            sessionStorage.setItem("path", result.filePath)
            fs.writeFile(result.filePath, project, function(err) {
                if (err) throw err
            })
        }
    })
}