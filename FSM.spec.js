const FSM = require('./');

test('it should throw if argument "initialState" is missing', () => {
    const getError = () => new FSM();
    expect(getError).toThrowError('missing argument: "initialState"');
});

test('it should throw if argument "transitions" is missing', () => {
    const getError = () => new FSM({ initialState: 'a:foo|b:bar' });
    expect(getError).toThrowError('missing argument: "transitions"');
});

test('it should allow a state string in the constructor', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a1: { from: { a: ['two', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'one' } },
        a2: { from: { a: ['one', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'two' } },
    };

    const fsm = new FSM({ initialState, transitions });
    expect(fsm).toHaveProperty('a1');
    expect(fsm).toHaveProperty('a2');
});

test('it should allow a state object in the constructor', () => {
    const initialState = { a: 'one', b: 'one' };
    const transitions = {
        a1: { from: { a: ['two', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'one' } },
        a2: { from: { a: ['one', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'two' } },
    };

    const fsm = new FSM({ initialState, transitions });
    expect(fsm).toHaveProperty('a1');
    expect(fsm).toHaveProperty('a2');
});

test('it should generate a state-string from a state-object', () => {
    const stateString = FSM.fromObjectToString({ a: 'foo', b: 'bar' });
    expect(stateString).toEqual('a:foo|b:bar');
});

test('it should sort the state-object before converting it to a state-string', () => {
    const stateString = FSM.fromObjectToString({ b: 'bar', a: 'foo' });
    expect(stateString).toEqual('a:foo|b:bar');
});

test('it should be able to handle a undefined', () => {
    const stateString = FSM.fromObjectToString(undefined);
    expect(stateString).toEqual(undefined);
});

test('it should generate a state-object from a state-string', () => {
    const stateObject = FSM.fromStringToObject('a:foo|b:bar');
    expect(stateObject).toEqual({ a: 'foo', b: 'bar' });
});

test('it should sort the state-string before converting it to a state-object', () => {
    const stateObject = FSM.fromStringToObject('b:bar|a:foo');
    const keys = Object.keys(stateObject);
    expect(keys).toEqual(['a', 'b']);
});

test('it should be able to handle a undefined', () => {
    const stateObject = FSM.fromStringToObject(undefined);
    expect(stateObject).toEqual(undefined);
});

test('it should build the transition functions on instantiation of the FSM', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a1: { from: { a: ['two', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'one' } },
        a2: { from: { a: ['one', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'two' } },
        a3: { from: { a: ['one', 'two'], b: ['one', 'two', 'three'] }, to: { a: 'three' } },
        b1: { from: { a: ['one', 'two', 'three'], b: ['two', 'three'] }, to: { b: 'one' } },
        b2: { from: { a: ['one', 'two', 'three'], b: ['one', 'three'] }, to: { b: 'two' } },
        b3: { from: { a: ['one', 'two', 'three'], b: ['one', 'two'] }, to: { b: 'three' } },
    };

    const fsm = new FSM({ initialState, transitions });
    expect(fsm).toHaveProperty('a1');
    expect(fsm).toHaveProperty('a2');
    expect(fsm).toHaveProperty('a3');
    expect(fsm).toHaveProperty('b1');
    expect(fsm).toHaveProperty('b2');
    expect(fsm).toHaveProperty('b3');
});

test('it should return a error and the old state if the transition is invalid', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a1: { from: { a: ['two', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'one' } },
    };

    const fsm = new FSM({ initialState, transitions });
    const { error, state, stateObject } = fsm.a1();
    expect(error.message).toEqual('invalid transition: "a1" in state: "{"a":"one","b":"one"}"');
    expect(state).toEqual(initialState);
    expect(stateObject).toEqual(FSM.fromStringToObject(initialState));
});

test('it should return no error and the new state if the transition is valid', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a2: { from: { a: ['one', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'two' } },
    };

    const fsm = new FSM({ initialState, transitions });
    const { error, state, stateObject } = fsm.a2();
    expect(error).toBeNull();
    expect(state).toEqual('a:two|b:one');
    expect(stateObject).toEqual({ a: 'two', b: 'one' });
});

test('it should change both subStates if specified in the "to" declaration', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a2: { from: { a: ['one', 'three'], b: ['one', 'three'] }, to: { a: 'two', b: 'two' } },
    };

    const fsm = new FSM({ initialState, transitions });
    const { error, state, stateObject } = fsm.a2();
    expect(error).toBeNull();
    expect(state).toEqual('a:two|b:two');
    expect(stateObject).toEqual({ a: 'two', b: 'two' });
});

test('it should return a error if a subState is not satisfied, also if it is not in the "to" declaration', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a2: { from: { a: ['one', 'three'], b: ['two', 'three'] }, to: { a: 'two' } },
    };

    const fsm = new FSM({ initialState, transitions });
    const { error, state, stateObject } = fsm.a2();
    expect(error.message).toEqual('invalid transition: "a2" in state: "{"a":"one","b":"one"}"');
    expect(state).toEqual(initialState);
    expect(stateObject).toEqual(FSM.fromStringToObject(initialState));
});

test('it should be able to call multiple transitions on the same fsm instance', () => {
    const initialState = 'a:one|b:one';
    const transitions = {
        a1: { from: { a: ['two', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'one' } },
        a2: { from: { a: ['one', 'three'], b: ['one', 'two', 'three'] }, to: { a: 'two' } },
        b1: { from: { a: ['one', 'two', 'three'], b: ['two', 'three'] }, to: { b: 'one' } },
        b2: { from: { a: ['one', 'two', 'three'], b: ['one', 'three'] }, to: { b: 'two' } },
    };

    const fsm = new FSM({ initialState, transitions });

    const { error: e1, state: s1, stateObject: so1 } = fsm.a2();
    expect(e1).toBeNull();
    expect(s1).toEqual('a:two|b:one');
    expect(so1).toEqual({ a: 'two', b: 'one' });
    expect(fsm.state).toEqual('a:two|b:one');

    const { error: e2, state: s2, stateObject: so2 } = fsm.b2();
    expect(e2).toBeNull();
    expect(s2).toEqual('a:two|b:two');
    expect(so2).toEqual({ a: 'two', b: 'two' });
    expect(fsm.state).toEqual('a:two|b:two');

    const { error: e3, state: s3, stateObject: so3 } = fsm.a1();
    expect(e3).toBeNull();
    expect(s3).toEqual('a:one|b:two');
    expect(so3).toEqual({ a: 'one', b: 'two' });
    expect(fsm.state).toEqual('a:one|b:two');

    const { error: e4, state: s4, stateObject: so4 } = fsm.b1();
    expect(e4).toBeNull();
    expect(s4).toEqual('a:one|b:one');
    expect(so4).toEqual({ a: 'one', b: 'one' });
    expect(fsm.state).toEqual('a:one|b:one');
});

test('it should also work with simple states', () => {
    const initialState = 'none';
    const transitions = {
        create: { from: ['none', 'created'], to: 'created' },
        delete: { from: ['created', 'deleted'], to: 'deleted' },
    };

    const fsm = new FSM({ initialState, transitions });
    expect(fsm).toHaveProperty('create');
    expect(fsm).toHaveProperty('delete');

    const { error: deleteError, state: deleteState, stateObject: deleteStateObject } = fsm.delete();
    expect(deleteError).toBeDefined();
    expect(deleteError.message).toEqual('invalid transition: "delete" in state: "none"');
    expect(deleteState).toEqual('none');
    expect(deleteStateObject).toBeUndefined();
    expect(fsm.state).toEqual('none');

    const { error: createError, state: createState, stateObject: createStateObject } = fsm.create();
    expect(createError).toBeNull();
    expect(createState).toEqual('created');
    expect(createStateObject).toBeUndefined();
    expect(fsm.state).toEqual('created');

    const { error: deleteError2, state: deleteState2, stateObject: deleteStateObject2 } = fsm.delete();
    expect(deleteError2).toBeNull();
    expect(deleteState2).toEqual('deleted');
    expect(deleteStateObject2).toBeUndefined();
    expect(fsm.state).toEqual('deleted');
});
