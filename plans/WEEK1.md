# Initial Social AGI goal

Create a super smooth developer experience for creating a Social AGI and integrating that into their application

## Imagine getting started kinda like this

First ensure you have node installed. Then, install

`npm i -g create-socialagi`

Afterwards, navigate to your desired directory where the project will exist and use the cli to create a socialagi

`npx create-socialagi`

when run, the command asks you to name your `socialagi` - default is `Div`. It creates and initializes a project that has everything you need to get started.

```
README.md
src/
    server/
        socialagi/
            Div.js
        index.js
variousConfigFiles.whatever
```

and then

```
export OPENAI_API_KEY=your_api_key && socialagi dev
```

runs a local server for the agi. The server has a debug web address `localhost:4000/chat`, which gives a visual chat and thought UI.

### Client library

Additionally, if you like to use the `socialagi` in your application: The server has a node client library that can be talked to with the following library usage.

```
const socialagi = require('socialagi');
const Div = socialagi.initialize() // by default it searches for a server on localhost
```

and then add listeners that fire on messages from the agi, and on thoughts from the agi

```
const onAGIMessageHandler = (message) => ...
Div.addListener('onAGIMessage', onAGIMessageHandler)

// optional
const onThoughtHandler = (thought) => ...
Div.addListener('onThoughtHandler, onThoughtHandler)
```

and then messages can be sent to `Div` which trigger the callbacks

`Div.sendMessage(message)`

### Presumably we also want a python client library

...

### Hosting

The socialagi can be hosted for convenience. The `socialagi` command runs a cli that gets your username, performs auth, asks for your OAI key, and then deploys to

`http://socialagi.chat/{user}/Div`

this web address is hosted by Methexis and can be sent to anyone for them to have their own unique chat with Div

Additionally, the address can be pointed to via the client library which instead can use

```
const Div = socialagi.initialize({sessionId, persona: 'Div'})
// uses SOCIALAGI_KEY from process.env if persona selected
```

from

```
socialagi createSecret
```

and of course

```
socialagi revokeSecret ...
```

with

```
socialagi listSecrets
```
