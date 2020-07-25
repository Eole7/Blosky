# Blosky
![alt text](https://i.goopics.net/aDZpR.jpg)
![alt text](https://i.goopics.net/X8Nog.jpg)

Blosky is an app that allows you to create Minecraft Spigot plugins from a visual interface, and compile them into Java

## Installation
- Install the JDK (Java Development Kit) to be able to compile your plugins: https://www.oracle.com/java/technologies/javase-jdk14-downloads.html
- [Download](https://github.com/Eole7/Blosky/releases) the latest version of Blosky in portable or installer version. If you want to use nightly builds, download them in [Actions](https://github.com/Eole7/Blosky/actions?query=branch%3Amaster+is%3Asuccess).
  Blosky has been packaged for Windows, macOS and Linux, but it has only been tested on Windows for the moment.
  - If you select the version to be installed, ignore the Windows SmartScreen alerts, and then follow the instructions given by the installer
  - If you choose the portable version, just extract the zip file
- Blosky has only a few syntaxes for the moment and lacks basic features; don't plan to make a real plugin with it

## To-Do
- Commands
- Variables
- Plugin config.yml
- Bukkit Runnables
- Compiling to multiple Minecraft versions
- Real-time detection of potential compilation errors
- Syntaxes search bar
- Support for other server software: Sponge, NukkitX, ...

See the full To-Do list on [Trello](https://trello.com/b/QUSLjWyG/blosky)

## Contributing
- Install Node.js and Git
- Fork the repository then clone yours
- Open the command prompt in the folder you just cloned to
- Do `npm install` to install all node modules

To launch the app, do `electron .` in the command prompt
