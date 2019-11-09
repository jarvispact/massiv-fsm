import FSM from '../src/fsm';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const createTrafficLightMachine = (initialState) => new FSM({
    initialState,
    transitions: {
        GREEN: {
            from: ['red'],
            to: 'green',
        },
        YELLOW: {
            from: ['green'],
            to: 'yellow',
        },
        RED: {
            from: ['yellow'],
            to: 'red',
        },
    },
});

export const createVendorMachine = (initialState, context) => {
    const initialContext = { credit: 0 };

    const contextReducer = (currentContext = initialContext, { transition, data }) => {
        switch (transition) {
        case 'INSERTMONEY':
            return { ...currentContext, credit: currentContext.credit + data.money };
        default:
            return currentContext;
        }
    };

    const passIfCreditIs1OrHigher = (ctx = {}) => {
        if (ctx.credit >= 1) return true;
        return new Error('you have not enough credit');
    };

    return new FSM({
        initialState,
        transitions: {
            INSERTMONEY: {
                from: ['idle', 'buying'],
                to: 'buying',
            },
            RESET: {
                from: ['idle', 'buying'],
                to: 'idle',
            },
            BUY: {
                from: ['buying'],
                to: 'idle',
            },
        },
        context,
        contextReducer,
        guards: { BUY: [passIfCreditIs1OrHigher] },
    });
};

export const createFormMachine = (initialState) => {
    const initialContext = {
        values: { email: '', password: '' },
        warnings: { email: '', password: '' },
        errors: { email: '', password: '' },
        validateOnChange: true,
        validateOnBlur: true,
    };

    const validate = ({ email, password }) => {
        const warnings = { email: '', password: '' };
        const errors = { email: '', password: '' };

        if (!email) errors.email = 'email is required';
        if (!password) errors.password = 'password is required';
        if (password && password.length < 5) warnings.password = 'password needs at least 5 characters';

        return { warnings, errors };
    };

    const reduceValues = (values, { name, value }) => ({ ...values, [name]: value });

    const contextReducer = (currentContext = initialContext, { transition, data }) => {
        switch (transition) {
        case 'CHANGE':
            return {
                ...currentContext,
                values: reduceValues(currentContext.values, data),
                warnings: currentContext.validateOnChange ? {
                    ...currentContext.warnings,
                    [data.name]: validate(reduceValues(currentContext.values, data)).warnings[data.name],
                } : currentContext.warnings,
                errors: currentContext.validateOnChange ? {
                    ...currentContext.errors,
                    [data.name]: validate(reduceValues(currentContext.values, data)).errors[data.name],
                } : currentContext.errors,
            };
        case 'BLUR':
            return {
                ...currentContext,
                warnings: currentContext.validateOnBlur ? {
                    ...currentContext.warnings,
                    [data.name]: validate(currentContext.values).warnings[data.name],
                } : currentContext.warnings,
                errors: currentContext.validateOnBlur ? {
                    ...currentContext.errors,
                    [data.name]: validate(currentContext.values).errors[data.name],
                } : currentContext.errors,
            };
        default:
            return currentContext;
        }
    };

    const submitDisabledGuard = (context) => {
        const hasErrors = Object.values(context.errors).filter(Boolean).length > 0;
        if (hasErrors) return new Error('submit disabled');
        return true;
    };

    return new FSM({
        initialState,
        transitions: {
            CHANGE: {
                from: ['idle'],
                to: '*',
            },
            BLUR: {
                from: ['idle'],
                to: '*',
            },
            SUBMIT: {
                from: ['idle'],
                to: 'submitting',
            },
            RESUBMIT: {
                from: ['submit-resolved', 'submit-rejected'],
                to: 'submitting',
            },
            SUBMIT_RESOLVE: {
                from: ['submitting'],
                to: 'submit-resolved',
            },
            SUBMIT_REJECT: {
                from: ['submitting'],
                to: 'submit-rejected',
            },
        },
        context: initialContext,
        contextReducer,
        guards: { SUBMIT: [submitDisabledGuard] },
    });
};
