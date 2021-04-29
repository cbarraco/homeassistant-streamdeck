// Protype which represents an action property inspector
function ActionPI(inUUID, inActionInfo) {
    var instance = this;

    // Public function called on initial set up
    this.setUp = function () {};

    // Public function called when the cache is updated
    this.update = function (homeAssistantCache) {};

    // Static function to add all entities of a certain type to an option element
    ActionPI.populateEntityOptions = function (element, type, homeAssistantCache) {
        logMessage("Populating entities parameter options");

        if (homeAssistantCache.entities === undefined) {
            logMessage("Cache is not populated yet");
            return;
        }

        logMessage(homeAssistantCache.entities);

        element.innerHTML = "";

        var keys = [];
        if (type != undefined) {
            // populate with specific key
            keys = [type];
        } else {
            // populate with all keys
            keys = Object.getOwnPropertyNames(homeAssistantCache.entities);
        }

        for (var i = 0; i < keys.length; i++) {
            const typeKey = keys[i];
            const optGroup = document.createElement("optgroup");
            optGroup.label = typeKey;
            const optionValues = homeAssistantCache.entities[typeKey];
            if (optionValues === undefined) {
                logMessage(`No entities of type ${typeKey} found`);
                return;
            }
            for (var j = 0; j < optionValues.length; j++) {
                const optionValue = optionValues[j].entity_id;
                const option = document.createElement("option");
                option.value = optionValue;
                option.innerHTML = optionValue;
                optGroup.appendChild(option);
            }
            element.appendChild(optGroup);
        }
    };
}
