// fetaures
// context, conditions, side-effects and actions
// side-effects: functions that will fire and forget (general event emitter ?)
// actions: functions where the result may change the next state

// use-cases
// form state handling
// fetch api data

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
    }

    reduceContext(transitionName, transitionData) {
        return this.contextReducer
            ? this.contextReducer(this.context, { transition: transitionName, data: transitionData })
            : this.context;
    }

    can(transitionName, data) {
        const transition = this.transitions[transitionName];
        if (!transition) throw new Error(`transition "${transitionName}" was not specified`);
        const fromStatesAllowTransition = transition.from.includes(this.state);

        const newContext = this.reduceContext(transitionName, data);
        const { guardsHaveErrors } = evaluateGuards(transitionName, data, newContext, this.guards);

        return fromStatesAllowTransition && !guardsHaveErrors;
    }

    transition(transitionName, data) {
        const newContext = this.reduceContext(transitionName, data);

        if (!this.can(transitionName, data)) {
            const { guardResults, guardsHaveErrors } = evaluateGuards(transitionName, data, newContext, this.guards);
            const error = guardsHaveErrors ? getTransitionError(transitionName, data, guardResults) : undefined;

            return {
                previousState: this.state,
                newState: this.state,
                stateHasChanged: false,
                context: this.context,
                error,
            };
        }

        const { to } = this.transitions[transitionName];
        const previousState = this.state;
        const newState = to === '*' ? previousState : to;
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

export { FSM };
