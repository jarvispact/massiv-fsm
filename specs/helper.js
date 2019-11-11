import FSM from '../src/fsm';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const createSimpleMachine = ({ initialState, context, contextReducer, guards }) => new FSM({
    initialState,
    transitions: {
        ONE: {
            from: ['two', 'three'],
            to: 'one',
        },
        TWO: {
            from: ['one', 'three'],
            to: 'two',
        },
        THREE: {
            from: ['one'],
            to: 'three',
        },
    },
    context,
    contextReducer,
    guards,
});
