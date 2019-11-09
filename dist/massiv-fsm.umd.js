(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.MASSIV = {}));
}(this, (function (exports) { 'use strict';

    const getTransitionError = (transitionName, transitionData, guardResults) => {
        const error = new Error(`error in transition: "${transitionName}"`);
        error.transitionData = transitionData;
        error.guards = guardResults;
        return error;
    };

    const evaluateGuards = (transitionName, transitionData, context, fsmGuards) => {
        const guards = fsmGuards ? fsmGuards[transitionName] || [] : [];
        const guardResults = guards.map(guard => guard(context, transitionData));
        const guardsHaveErrors = guardResults.some(result => result instanceof Error);
        return { guardResults, guardsHaveErrors };
    };

    const FSM = class {
        constructor({ initialState, transitions, context, contextReducer, guards } = {}) {
            if (!initialState) throw new Error('no initialState provided');
            if (!transitions) throw new Error('no transitions provided');
            this.initialState = initialState;
            this.transitions = transitions;
            this.context = context;
            this.state = initialState;
            this.contextReducer = contextReducer;
            this.guards = guards;
            this.subscribers = [];
        }

        on(name, fn) {
            this.subscribers.push({ name, fn });
        }

        async emit(name, data) {
            const subscribers = this.subscribers.filter(s => s.name === name).map(s => s.fn);
            const results = await Promise.all(subscribers.map(fn => fn(this.context, data)));
            return results;
        }

        reduceContext(name, transitionData) {
            return this.contextReducer
                ? this.contextReducer(this.context, { transition: name, data: transitionData })
                : this.context;
        }

        can(name, data) {
            const transition = this.transitions[name];
            if (!transition) throw new Error(`transition "${name}" was not specified`);
            const fromStatesAllowTransition = transition.from.includes(this.state);

            const newContext = this.reduceContext(name, data);
            const { guardsHaveErrors } = evaluateGuards(name, data, newContext, this.guards);

            return fromStatesAllowTransition && !guardsHaveErrors;
        }

        async transition(name, data) {
            const newContext = this.reduceContext(name, data);

            if (!this.can(name, data)) {
                const { guardResults, guardsHaveErrors } = evaluateGuards(name, data, newContext, this.guards);
                const error = guardsHaveErrors ? getTransitionError(name, data, guardResults) : undefined;

                return {
                    previousState: this.state,
                    newState: this.state,
                    stateHasChanged: false,
                    context: this.context,
                    error,
                };
            }

            const { to } = this.transitions[name];
            const previousState = this.state;
            const newState = to === '*' ? previousState : to;
            const stateHasChanged = newState !== previousState;

            this.state = newState;
            this.context = newContext;

            const subscriberResults = await this.emit(name, data);

            return {
                previousState,
                newState,
                stateHasChanged,
                context: this.context,
                subscriberResults,
            };
        }
    };

    exports.FSM = FSM;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
