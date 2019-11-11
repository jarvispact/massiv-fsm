const getTransitionError = (transitionName, transitionData, guardResults) => {
    const error = new Error(`error in transition: "${transitionName}"`);
    error.transitionData = transitionData;
    error.guards = guardResults;
    return error;
};

export default getTransitionError;
