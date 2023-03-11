// Prototype which represents a call service action property inspector
function CallServiceActionPI(uuid, actionInfo) {
    var instance = this;

    var settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];
    var context = actionInfo["context"];

    // Inherit from Action
    ActionPI.call(this, uuid, actionInfo);

    var actionSetUp = this.setUp;
    // Public function called on initial setup
    this.setUp = function () {
        actionSetUp.call(this);
        logMessage("Injecting call service parameters");
        const wrapper = document.getElementById("wrapper");
        wrapper.innerHTML += `
            <div class="sdpi-item">
                <div class="sdpi-item-label">Service</div>
                <select class="sdpi-item-value select" id="serviceId">
                </select>
            </div>
            <div type="textarea" class="sdpi-item"">
                <div class="sdpi-item-label">Payload</div>
                <span class="sdpi-item-value textarea">
                    <textarea type="textarea" id="payload"></textarea>
                </span>
            </div>`;

        var serviceIdElement = document.getElementById("serviceId");
        serviceIdElement.value = settings.serviceId;
        serviceIdElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.serviceId = value;
            saveSettings(action, uuid, settings);
        });

        wrapper.innerHTML += `
            <div class="sdpi-item">
                <button class="sdpi-item-value" id="refreshCache">Refresh</button>
            </div>`;
        const refreshCache = document.getElementById("refreshCache");
        refreshCache.addEventListener("click", function () {
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_CACHE_REFRESH,
            });
        });

        var payloadElement = document.getElementById("payload");
        if (settings.payload != undefined) {
            payloadElement.value = settings.payload;
        }
        payloadElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.payload = value;
            saveSettings(action, uuid, settings);
        });
    };

    this.update = function(homeAssistantCache){
        function populateServiceOptions(serviceIdElement, type) {
            logMessage("Populating services parameter options");
            logMessage(homeAssistantCache.services);
            populateOptionsFromCacheProperty(serviceIdElement, homeAssistantCache.services, type);
        }
    
        // move this to ActionPI and try to replace the entity populater with this
        function populateOptionsFromCacheProperty(element, cacheProperty, type) {
            element.innerHTML = "";
    
            var keys = [];
            if (type != undefined) {
                // populate with specific key
                keys = [type];
            } else {
                // populate with all keys
                keys = Object.getOwnPropertyNames(cacheProperty);
            }
    
            for (var i = 0; i < keys.length; i++) {
                const typeKey = keys[i];
                const optGroup = document.createElement("optgroup");
                optGroup.label = typeKey;
                const optionValues = cacheProperty[typeKey];
                for (var j = 0; j < optionValues.length; j++) {
                    const optionValue = optionValues[j];
                    const option = document.createElement("option");
                    option.value = optionValue;
                    option.innerHTML = optionValue;
                    optGroup.appendChild(option);
                }
                element.appendChild(optGroup);
            }
        }

        var serviceIdElement = document.getElementById("serviceId");
        populateServiceOptions(serviceIdElement);
        if (settings.serviceId != undefined) {
            serviceIdElement.value = settings.serviceId;
        } else {
            // save whatever is first
            settings.serviceId = serviceIdElement.value;
            saveSettings(action, uuid, settings);
        }

        var payloadElement = document.getElementById("payload");
        if (settings.payload != undefined) {
            payloadElement.value = settings.payload;
        }
    };
}
