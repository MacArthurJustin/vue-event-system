/**
 * Installs the Vue-Event-System
 * Vue Plugin to a unified local and remote event system
 *
 * @module vue-event-system/events
 * @author Justin MacArthur <macarthurjustin@gmail.com>
 * @version 0.0.1
 *
 * @param {Object} Vue
 * @param {Object} [options]
 */

module.exports.install = function(Vue, options) {
  Vue.Events = {
    remote: (function (options) {
      let Client = null,
        Handlers = Object.create(null),
        socketPump = [],
        pumpInterval = null

      options = options || {}
      options.secure = options.secure || false
      options.host = options.host || "localhost"
      options.port = options.port || 8080
      options.identifier = options.identifier || 'identifier'
      options.endpoint = options.endpoint || ''
      options.camelCase = options.camelCase || true

      /**
       * Connect to Websocket Server
       */
      function connect () {
        Client = new WebSocket(`${(options.secure ? 'wss://' : 'ws://')}${options.host}${options.port ? ':' + options.port : ''}/${options.endpoint}`, options.protocol)

        Client.onopen = openHandler
        Client.onerror = errorHandler
        Client.onmessage = messageHandler
        Client.onclose = closeHandler
      }

      /**
       * Handle Server Connection Event
       *
       * @param {Event} open
       */
      function openHandler (open) {
        console.log("Connected to Web Server")
        console.log(open)

        if (options.openHandler) options.openHandler(open)
      }

      /**
       * Handle Server Errors
       *
       * @param {Event} error
       */
      function errorHandler (error) {
        console.log("Error occured")
        console.log(error)

        if (options.errorHandler) options.errorHandler(error)
      }

      /**
       * Handle Messages Returned from the Server
       *
       * @param {MessageEvent} message
       * @returns
       */
      function messageHandler (message) {
        let Json = JSON.parse(message.data),
          identifier = options.camelCase ? Json[options.identifier].replace(
            /-([A-Za-z0-9])/gi,
            (s, group1) => group1.toUpperCase()
          ) : Json[options.identifier],
          Events = Handlers[identifier]

        if (Events) {
          Events.forEach(
            (Event) => {
              //Event.callback.apply(Event.thisArg, [Json.data])
              //Adapt to all respone format
              Event.callback.apply(Event.thisArg, [Json])
            }
          )
        }
      }

      /**
       * {EventListener} For When the Websocket Client Closes the Connection
       *
       * @param {CloseEvent} close
       */
      function closeHandler (close) {
        if (options.closeHandler) options.closeHandler(close)

        if (pumpInterval) {
          window.clearInterval(pumpInterval)
          pumpInterval = null
        }

        Client = null
      }

      /**
       * Attaches Handlers to the Event Pump System
       *
       * @param {String} identifier   Unique Name of the trigger
       * @param {Function} callback   Function to be called when the trigger is tripped
       * @param {Object} [thisArg]    Arguement to be passed to the handler as `this`
       */
      function attachHandler (identifier, callback, thisArg) {
        identifier = options.camelCase ? identifier.replace(
          /-([A-Za-z0-9])/gi,
          (s, group1) => group1.toUpperCase()
        ) : identifier

        !(Handlers[identifier] || (Handlers[identifier] = [])).push({
          callback: callback,
          thisArg: thisArg
        })
      }

      /**
       * Detaches Handlers from the Event Pump System
       *
       * @param {String} identifier   Unique Name of the trigger
       * @param {Function} callback   Function to be called when the trigger is tripped
       */
      function detachHandler (identifier, callback) {
        identifier = options.camelCase ? identifier.replace(
          /-([A-Za-z0-9])/gi,
          (s, group1) => group1.toUpperCase()
        ) : identifier

        if (arguments.length === 0) {
          Handlers = Object.create(null)
          return
        }

        let Handler = Handlers[identifier]
        if (!Handler) return

        if (arguments.length === 1) {
          Handlers[identifier] = null
          return
        }

        for (let index = Handler.length - 1; index >= 0; index--) {
          if (Handler[index].callback === callback || Handler[index].callback.fn === callback) {
            Handler.splice(index, 1)
          }
        }
      }

      /**
       * Handles Event Triggers
       *
       * @param {String} identifier
       * @returns
       */
      function emitHandler (identifier) {
        let args = arguments[1] || []
        if (arguments.length > 2) {
          args = arguments.length > 1 ? [].slice.apply(arguments, [1]) : []
        }

        if (typeof args === "object") {
          args.identifier = identifier

          socketPump.push(JSON.stringify(args))
          return
        }

        socketPump.push(
          JSON.stringify({
            'identifier': identifier,
            'arguments': args
          })
        )
      }

      /**
       * Sends Messages to the Websocket Server every 250 ms
       *
       * @returns
       */
      function pumpHandler () {
        if (socketPump.length === 0) return
        if (!Client) connect()

        if (Client.readyState === WebSocket.OPEN) {
          socketPump.forEach(
            (item) => Client.send(item)
          )

          socketPump.length = 0
        }
      }

      if (!pumpInterval) window.setInterval(pumpHandler, 250)

      return {
        connect: connect,
        disconnect: () => {
          if (Client) {
            Client.close()
            Client = null
          }
        },
        attach: attachHandler,
        detach: detachHandler,
        emit: emitHandler
      }
    })(options),
    local: (function (options) {
      let Handlers = Object.create(null),
          socketPump = []

      options = options || {}
      options.camelCase = options.camelCase || true

      /**
       * Attaches Handlers to the Event Pump System
       *
       * @param {Boolean} server      True/False whether the Server should process the trigger
       * @param {String} identifier   Unique Name of the trigger
       * @param {Function} callback   Function to be called when the trigger is tripped
       * @param {Object} [thisArg]    Arguement to be passed to the handler as `this`
       */
      function attachHandler (identifier, callback, thisArg) {
        identifier = options.camelCase ? identifier.replace(
          /-([A-Za-z0-9])/gi,
          (s, group1) => group1.toUpperCase()
        ) : identifier

        !(Handlers[identifier] || (Handlers[identifier] = [])).push({
          callback: callback,
          thisArg: thisArg
        })
      }

      /**
       * Detaches Handlers from the Event Pump System
       *
       * @param {String} identifier   Unique Name of the trigger
       * @param {Function} callback   Function to be called when the trigger is tripped
       */
      function detachHandler (identifier, callback) {
        identifier = options.camelCase ? identifier.replace(
          /-([A-Za-z0-9])/gi,
          (s, group1) => group1.toUpperCase()
        ) : identifier

        if (arguments.length === 0) {
          Handlers = Object.create(null)
          return
        }

        let Handler = Handlers[identifier]
        if (!Handler) return

        if (arguments.length === 1) {
          Handlers[identifier] = null
          return
        }

        for (let index = Handler.length - 1; index >= 0; index--) {
          if (Handler[index].callback === callback || Handler[index].callback.fn === callback) {
            Handler.splice(index, 1)
          }
        }
      }

      /**
       * Handles Event Triggers
       *
       * @param {String} identifier
       * @returns
       */
      function emitHandler (identifier) {
        identifier = options.camelCase ? identifier.replace(
            /-([a-z])/gi,
            (s, group1) => group1.toUpperCase()
          ) : identifier,
          Events = Handlers[identifier]

        let args = arguments.length > 2 ? [].slice.apply(arguments, [1]) : (arguments.length > 1 ? arguments[1] : [])

        if (typeof args !== "object") {
          args = {
            'arguments': args
          }
        }
        args[options.identifier] = identifier

        if (Events) {
          Events.forEach(
            (Event) => {
              //Event.callback.apply(Event.thisArg, [Json.data])
              //Adapt to all respone format
              Event.callback.apply(Event.thisArg, [args])
            }
          )

          return true
        }

        return false
      }

      return {
        attach: attachHandler,
        detach: detachHandler,
        emit: emitHandler
      }
    })()
  }

  Vue.getRemoteID = function () {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(
      /[018]/g,
      c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }

  Vue.mixin({
    data () {
      return {
        vue_event_remote_id: Vue.getRemoteID()
      }
    },
    created () {
      if (this.$options.events)
      {
        let Handlers = this.$options.events
        for (let name in Handlers) {
          if (Handlers.hasOwnProperty(name)) {
            if (typeof Handlers[name] === 'function') {
              Vue.Events.local.attach(name, Handlers[name], this)
              continue
            }

            if(typeof Handlers[name] === 'object') {
              if(typeof Handlers[name].local === 'function')
                Vue.Events.local.attach(name, Handlers[name], this)

              if(typeof Handlers[name].remote === 'function')
                Vue.Events.remote.attach(name, Handlers[name], this)
            }
          }
        }
      }
    },
    beforeDestroy () {
      if (this.$options.events)
      {
        let Handlers = this.$options.events
        for (let name in Handlers) {
          if (Handlers.hasOwnProperty(name) && typeof Handlers[name] === "function") {
            Vue.Events.local.detach(name, Handlers[name])
            Vue.Events.remote.detach(name, Handlers[name])
          }
        }
      }
    }
  });

  Vue.prototype.$events = {
    $on: function(identifier, isLocal, callback) {
      Vue.Events[isLocal ? 'local' : 'remote'].attach(identifier, callback, this)
      return this
    },
    $once: function(identifier, isLocal, callback) {
      const thisArg = this
      function once() {
        Vue.remote.detach(identifier, callback)
        callback.apply(thisArg, arguments)
      }

      once.fn = callback

      Vue.Events[isLocal ? 'local' : 'remote'].attach(identifier, once, thisArg)
      return thisArg
    },
    $off: function(identifier, callback) {
      Vue.Events.local.detach(identifier, callback, this)
      Vue.Events.remote.detach(identifier, callback, this)
      return this
    },
    $emit: function(identifier) {
      if(!Vue.Events.local.emit.apply(this, arguments))
        Vue.Events.remote.emit.apply(this, arguments)
    }
  };
};
