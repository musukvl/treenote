## General guidelines
- The app is Electron based, so it should be cross-platform and work on Windows, Linux and MacOS.
- The app should follow the best practices of obsidian application development, such as simplicity and be ready for performance optimizations.

## Terminal commands
- For complex operations generate python or bash scripts and place it to __scripts folder
- Each script in __scripts folder should have comment with purpose description.
- Reuse the scripts if possible.

## Building apps
- For each application "build.sh" or "build.ps1" file should be created to build application from scratch. It should install dependencies and create executalbe. 