'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// fetaures
// context, conditions, side-effects and actions
// side-effects: functions that will fire and forget (general event emitter ?)
// actions: functions where the result may change the next state

// use-cases
// traffic light
// vending machine
// form state handling
// fetch api data

const getError = (transitionName, transitionData, guardResults) => {
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
    }

    can(transitionName, data) {
        const transition = this.transitions[transitionName];
        if (!transition) throw new Error(`transition "${transitionName}" was not specified`);
        const fromStatesAllowTransition = transition.from.includes(this.state);

        const newContext = this.contextReducer
            ? this.contextReducer(this.context, { transition: transitionName, data })
            : this.state;

        const { guardsHaveErrors } = evaluateGuards(transitionName, data, newContext, this.guards);

        return fromStatesAllowTransition && !guardsHaveErrors;
    }

    transition(transitionName, data) {
        const newContext = this.contextReducer
            ? this.contextReducer(this.context, { transition: transitionName, data })
            : this.state;

        if (!this.can(transitionName, data)) {
            const { guardResults, guardsHaveErrors } = evaluateGuards(transitionName, data, newContext, this.guards);

            return {
                previousState: this.state,
                newState: this.state,
                stateHasChanged: false,
                context: this.context,
                error: guardsHaveErrors ? getError(transitionName, data, guardResults) : undefined,
            };
        }

        const previousState = this.state;
        const newState = this.transitions[transitionName].to;
        const stateHasChanged = newState !== previousState;

        this.state = newState;
        this.context = newContext;

        return {
            previousState,
            newState,
            stateHasChanged,
            context: this.context,
        };
    }
};

exports.FSM = FSM;
