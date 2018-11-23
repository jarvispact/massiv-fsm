const defaultKey = '__default__';

const FSM = class {
    constructor({ initialState, transitions } = {}) {
        if (!initialState) throw new Error('missing argument: "initialState"');
        if (!transitions) throw new Error('missing argument: "transitions"');
        const stateString = typeof initialState === 'string' ? initialState : FSM.fromObjectToString(initialState);
        this.initialState = stateString.includes(':') ? stateString : `${defaultKey}:${stateString}`;
        this.transitions = transitions;
        this.state = this.initialState;
        this.buildTransitions();
    }

    static fromObjectToString(object) {
        if (!object) return undefined;
        const entries = Object.entries(object);
        const stringPairs = entries.map(([key, value]) => `${key}:${value}`).sort();
        return stringPairs.join('|');
    }

    static fromStringToObject(string) {
        if (!string) return undefined;
        const keyValuePairs = string.split('|').sort();
        return keyValuePairs.reduce((acc, keyValuePair) => {
            const [key, value] = keyValuePair.split(':');
            acc[key] = value;
            return acc;
        }, {});
    }

    buildTransitions() {
        const { state, transitions } = this;
        const stateObject = FSM.fromStringToObject(state);
        const transitionEntries = Object.entries(transitions);

        transitionEntries.forEach(([transitionName, { from, to }]) => {
            this[transitionName] = () => {
                const fromEntries = Array.isArray(from) ? Object.entries({ [defaultKey]: from }) : Object.entries(from);
                /* eslint-disable no-restricted-syntax */
                for (const [subState, fromStates] of fromEntries) {
                    if (!fromStates.includes(stateObject[subState])) {
                        const currentState = stateObject[defaultKey] || JSON.stringify(stateObject);
                        const error = new Error(`invalid transition: "${transitionName}" in state: "${currentState}"`);
                        this.state = stateObject[defaultKey] || FSM.fromObjectToString(stateObject);
                        return { error, state: this.state, stateObject: stateObject[defaultKey] ? undefined : stateObject };
                    }
                }

                for (const [subState] of fromEntries) {
                    const toValue = stateObject[defaultKey] ? to : to[subState];
                    stateObject[subState] = toValue || stateObject[subState];
                }
                /* eslint-enable no-restricted-syntax */

                this.state = stateObject[defaultKey] || FSM.fromObjectToString(stateObject);
                return { error: null, state: this.state, stateObject: stateObject[defaultKey] ? undefined : stateObject };
            };
        });
    }
};

module.exports = FSM;
