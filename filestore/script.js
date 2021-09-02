/* eslint-disable require-jsdoc */

$(document).ready(function() {
    // add page header
    $('#header').load('../header.html');
    updateStoreLogin();
});

function updateStoreLogin() {
    $.ajax({
        url: '/user/storelogin',
        type: 'GET',
        beforeSend: function(xhr) {
            const csrftoken = getCookie('csrftoken');
            xhr.setRequestHeader('X-CSRFToken', csrftoken);
        },
        crossDomain: true,
        success: function(response) {
            console.log('storelogin success!');
            loadStoreFront();
        },
    });
}

function loadStoreFront() {
    const auth = getCookie('auth');
    localStorage.setItem('jwt', auth);
    $.ajax({
        url: '/storemng',
        type: 'GET',
        xhrFields: {
            withCredentials: true,
        },
        crossDomain: true,
        success: function(response) {
            console.log('storemng success!');
            document.getElementById('storeIframe').contentWindow.document.write(response);
        },
    });
}

/**
 * Utility function to get cookie value
 * @param {string} name cookie name
 * @return {string} cookie value
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
