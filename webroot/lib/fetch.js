// post invokes a POST request
// dst: Target URL
// op: The body to pass to the request
// func: Function to invoke with the result
function post(dst, op, func) {
    fetch(dst, {
        method: 'POST',
        cache: "no-store",
        headers: {
            'desc-Type': 'application/json',
        },
        body: JSON.stringify(op),
    })
    .then(res => res.json())
    .then(res => {
        if (res.error ) {
            alert("Error:" + res.error);
            throw new Error(res.error);
        };
        return res;
    })
    .then(res => func(res))
    .catch(error => console.error('Error: ', error));
}

// post invokes a GET request
// dst: Target URL
// func: Function to invoke with the result
function get(dst, func) {
    fetch(dst, {
        method: 'GET',
        cache: "no-store",
    })
    .then(res => res.json())
    .then(res => {
        if (res.error ) {
            alert("Error:" + res.error);
            throw new Error(res.error);
        };
        return res;
    })
    .then(res => func(res))
    .catch(error => console.error('Error: ', error));
}
