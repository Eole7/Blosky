const { parentPort, workerData } = require('worker_threads');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function compile(appPath, outputPath, hasListeners, hasCommands) {
    // Compiling .java files to Java Bytecode (.class)
    await new Promise((resolve, reject) => {
        exec(
            `javac -classpath "${appPath}/src/transpiler/Libraries/Spigot/1.16.1.jar" -target 8 -source 8 "${appPath}/temp/fr/blosky/*.java"`,
            (err) => {
                if (err) return reject(new Error('javac failed: ' + err.message));
                resolve();
            }
        );
    });

    fs.unlinkSync(path.join(appPath, 'temp/fr/blosky/Main.java'));
    if (hasListeners) fs.unlinkSync(path.join(appPath, 'temp/fr/blosky/Listeners.java'));
    if (hasCommands) fs.unlinkSync(path.join(appPath, 'temp/fr/blosky/Commands.java'));

    // Encapsulating the files into a .jar
    await new Promise((resolve, reject) => {
        exec(
            `jar cvf "${outputPath}.jar" -C "${appPath}/temp" .`,
            (err) => {
                if (err) return reject(new Error('jar failed: ' + err.message));
                resolve();
            }
        );
    });

    return outputPath + '.jar';
}

parentPort.on('message', async ({ appPath, outputPath, hasListeners, hasCommands }) => {
    try {
        const result = await compile(appPath, outputPath, hasListeners, hasCommands);
        parentPort.postMessage({ success: true, result });
    } catch (e) {
        parentPort.postMessage({ success: false, error: e.message });
    }
});
