// Protype which represents an action property inspector
function ActionPI(inUUID, inActionInfo) {
    var instance = this;

    // Public function called on initial set up
    this.setUp = function () {};

    // Public function called when the cache is updated
    this.update = function (homeAssistantCache) {};

    // Static function to add all entities of a certain domain to an option element
    ActionPI.populateEntityOptionsFromDomain = function (element, domain, homeAssistantCache) {
        logMessage("Populating entity options");
        if (homeAssistantCache.entities === undefined) {
            logMessage("Cache is not populated yet");
            return;
        }

        // create option for each entity and add to the domain group
        const entityIds = Object.keys(homeAssistantCache.entities).filter((e) => e.startsWith(domain + "."));
        const optionsElement = document.createElement("optgroup");
        optionsElement.label = domain;
        for (var j = 0; j < entityIds.length; j++) {
            const optionElement = document.createElement("option");
            optionElement.value = entityIds[j];
            optionElement.innerHTML = entityIds[j];
            optionsElement.appendChild(optionElement);
        }

        element.innerHTML = "";
        element.appendChild(optionsElement);
    };
}
