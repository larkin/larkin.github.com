'use strict';

var calculateLikeness = function (a, b) {
    return _.zip(a, b)
        .reduce(function (likeness, chars) {
            if (chars[0] === chars[1]) {
                likeness += 1;
            }
            return likeness;
        }, 0);
};

var calculateScores = function (passwords) {
    var passwordResults = _.reduce(passwords, function (results, password) {
        results[password] = {
            _totalLikeness: 0,
            _password: password
        };
        return results;
    }, {});
    
    // Calculate overall likeness.
    _.forEach(passwordResults, function (passwordResult, password) {
        _.forEach(passwordResults, function (otherPasswordResult, otherPassword) {
            if (otherPasswordResult === passwordResult) {
                return;
            }
            if (passwordResult[otherPassword]) {
                return;
            }

            var likeness = calculateLikeness(password, otherPassword);
            if (!passwordResult[likeness]) {
                passwordResult[likeness] = [];
            }
            if (!otherPasswordResult[likeness]) {
                otherPasswordResult[likeness] = [];
            }
            
            // Store references by likeness.
            otherPasswordResult[likeness].push(passwordResult);
            passwordResult[likeness].push(otherPasswordResult);
            
            passwordResult._totalLikeness += likeness;
            otherPasswordResult._totalLikeness += likeness;
            otherPasswordResult[password] = likeness;
            passwordResult[otherPassword] = likeness;
        });
    });
    
    var resultArray = _.map(passwordResults, function (results, password) {
        return {
            password: password,
            results: results
        };
    });
    
    resultArray = _.sortBy(resultArray, function (passwordResult) {
        return passwordResult.results._totalLikeness;
    }).reverse();
    
    return {
        asArray: resultArray,
        asObject: passwordResults
    };
};

var initialize = function () {
    var entryForm = document.getElementById('password-entry');
    var passwordField = document.querySelectorAll('[name=passwords]')[0];
    var resultList = document.getElementById('password-results');
    var resultTemplate = _.template(document.getElementById('resultTemplate').innerHTML);
    
    var currentResults = {};
    
    var renderResults = function (results) {
        resultList.innerHTML = _.map(results.asArray, resultTemplate).join('');
    }
    
    entryForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var passwords = _(passwordField.value.split('\n'))
            .map(_.trim)
            .map(function (password) {
                return password.toLowerCase();
            })
            .compact()
            .value();
            
        var results = currentResults = calculateScores(passwords);
        renderResults(results);
    });
    
    window.addEventListener('focusout', function (event) {
        if (!event.target || event.target.getAttribute('type') !== 'number') {
            return;
        }
        var actualLikeness = parseInt(event.target.value, 0);
        if (_.isNaN(actualLikeness)) {
            return;
        }
        var testedPassword = event.target.parentElement.parentElement.id
            .replace('result-', '');
        var testedPasswordResults = currentResults.asObject[testedPassword];
        var possiblePasswords = _.pluck(testedPasswordResults[actualLikeness], '_password');
            
        
        var results = currentResults = calculateScores(possiblePasswords);
        renderResults(results);
    });
};