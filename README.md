# Hitachi Boarding with Finger Vein #

This is an web application demonstrating authentication with Hitachi Finger Vein Device (H1E-USB). **Hitachi Finger Vein Device (H1E-USB) API** (https://github.com/wyericso/hitachi-fingervein) should be running when this application is to be used.

This application is for demonstration purposes only.

## Requirements ##
- Tested on:
    - Ubuntu 18.04.1 Desktop
    - Node.js 10.13.0
- Require Internet access for loading pictures and MongoDB online.
- Tested browsers:
    - Safari 12.0.1 on macOS
    - Chrome 70.0.3538.102 on macOS

## Instructions ##
1. Modify `.env` for your appliation environment.
2. Plugin the Hitachi Finger Vein Device (H1E-USB).
3. Start **Hitachi Finger Vein Device (H1E-USB) API** (https://github.com/wyericso/hitachi-fingervein).
4. Run `sudo node app.js` to start this application.
5. Use web browser to open the web interface.

## Todo ##
- Registration with user inputting boarding pass information
- Test migrating platform
- Minor bug fixing:
    - Cannot reset finger vein device after API starting
- eslint
    - Try use `const` whenever possible
    - Use `() => {}` instead of `function () {}` whenever possible
- Screen capture or recording for presentation
- Explore glitch
- Error handling
