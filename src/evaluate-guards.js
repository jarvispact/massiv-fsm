const evaluateGuards = (transitionName, transitionData, context, fsmGuards) => {
    const guards = fsmGuards ? fsmGuards[transitionName] || [] : [];
    const guardResults = guards.map(guard => guard(context, transitionData));
    const guardsHaveErrors = guardResults.some(result => result instanceof Error);
    return { guardResults, guardsHaveErrors };
};

export default evaluateGuards;
