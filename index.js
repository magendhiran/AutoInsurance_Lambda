'use strict';
exports.handler = (event, context, callback) => {
    console.log('starts');
    console.log(event.inputTranscript);
    var request = require('request');
    var fs = require('fs');
    var validator = require("email-validator");
    var addressValidator = require('address-validator');
    var _ = require('underscore');

    // request('https://httpbin.org/get', function (error, response, body) {
    //     console.log('error:', error); // Print the error if one occurred
    //     // console.log('response:', response ); // Print the response status code if a response was received
    //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    //     console.log('body:', body); // Print the HTML for the Google homepage.
    // });


    // request.post('https://httpbin.org/post', {
    //     // again the same meta data + the actual photo
    //     formData: {
    //         title: 'Title',
    //         file: fs.createReadStream('service-input.xml')
    //     }
    // }, function (err, res, body) {
    //     console.log('post')
    //     console.log('error:', err); // Print the error if one occurred
    //     // console.log('response:', response ); // Print the response status code if a response was received
    //     console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
    //     console.log('body:', body); // Print the HTML for the Google homepage.
    // });


    // console.log(JSON.stringify(context));
    console.log(JSON.stringify(event));
    console.log(event.sessionAttributes);
    const sessionAttributes = event.sessionAttributes;
    const slots = event.currentIntent.slots;
    const intentName = event.currentIntent.name;
    const invSource = event.invocationSource;
    const userInput = event.inputTranscript;
    let response = {
        sessionAttributes: sessionAttributes,
        dialogAction: {
            type: "Delegate",
            slots: slots
        }
    };


    console.log(intentName);
    console.log(invSource);
    switch (intentName) {
    case "GetQuoteForAutoInsurance":
        if (invSource == 'DialogCodeHook') {
            console.log('Object.keys(sessionAttributes).length ' + Object.keys(sessionAttributes).length);
            var currentSlot = findCurrentSlot(slots);
            console.log('currentSlot ' + currentSlot);
            if (currentSlot == "EmailId" && userInput != slots.LastName) {
                if (validator.validate(userInput)) {
                    callback(null, response);
                } else {
                    response = createFulfilledResponse(sessionAttributes, "Please enter valid email address", intentName, slots, 'EmailId');
                    console.log(response);
                    callback(null, response);
                }
            } else if (currentSlot == "Address" && userInput != slots.EmailId) {
                var address = userInput;
                addressValidator.validate(address, addressValidator.match.streetAddress, function (err, exact, inexact, geocodingResponse) {
                    console.log('input: ', address.toString())
                    console.log('match: ', _.map(exact, function (a) {
                        return a.toString();
                    }));
                    console.log('did you mean: ', _.map(inexact, function (a) {
                        return a.toString();
                    }));
                    // console.log(geocodingResponse);
                    // console.log(geocodingResponse.status);
                    // console.log(exact.length);
                    // console.log(inexact.length);
                    if (exact.length == 0 && inexact.length == 0) {
                        console.log('match not found')
                        slots.Address = null;
                        console.log(slots);
                        response = createFulfilledResponse(sessionAttributes, "Please enter valid mailing address", intentName, slots, 'Address');
                        // console.log(response);
                        callback(null, response);
                    } else {
                        if (exact.length == 1) {
                            console.log(JSON.stringify(exact[0]));
                            var fullAddress = exact[0];
                            slots.Address = fullAddress.streetNumber + ' ' + fullAddress.streetAbbr + ', ' + fullAddress.city + ', ' + fullAddress.stateAbbr + fullAddress.postalCode;
                        }
                        callback(null, response);
                    }
                    console.log(err);
                });
            } else {
                callback(null, response);
            }
        } else if (invSource == 'FulfillmentCodeHook') {
            console.log('FulfillmentCodeHook');
            request.post('http://52.14.9.150:8080/DocumentService_v1/service/create/email', {
                // again the same meta data + the actual photo
                formData: {
                    file: fs.createReadStream('service-input.xml')
                }
            }, function (err, res, body) {
                console.log('post')
                console.log('error:', err); // Print the error if one occurred
                console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
                console.log('body:', body); // Print the HTML for the Google homepage.
                var serviceResp = JSON.parse(body);
                if (typeof serviceResp == 'object') {
                    console.log(serviceResp);
                    console.log(serviceResp.submitRc);
                    response = {
                        sessionAttributes: sessionAttributes,
                        dialogAction: {
                            type: "Close",
                            fulfillmentState: "Fulfilled",
                            message: {
                                contentType: "PlainText",
                                content: 'Thank you! your quote details will be sent in email.'
                            }
                        }
                    };
                    callback(null, response);
                }
            });
            
        } else {
            console.log('else');
            callback(null, response);
        }
        break;
    case "AddressChange":
        if (invSource == 'DialogCodeHook') {
            callback(null, response);
        } else if (invSource == 'FulfillmentCodeHook') {
            console.log('FulfillmentCodeHook');
            request.post('http://52.14.9.150:8080/DocumentService_v1/service/create/email', {
                // again the same meta data + the actual photo
                formData: {
                    file: fs.createReadStream('service-input.xml')
                }
            }, function (err, res, body) {
                console.log('post')
                console.log('error:', err); // Print the error if one occurred
                console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
                console.log('body:', body); // Print the HTML for the Google homepage.
                var serviceResp = JSON.parse(body);
                if (typeof serviceResp == 'object') {
                    console.log(serviceResp);
                    console.log(serviceResp.submitRc);

                    response = {
                        sessionAttributes: sessionAttributes,
                        dialogAction: {
                            type: "Close",
                            fulfillmentState: "Fulfilled",
                            message: {
                                contentType: "PlainText",
                                content: 'Your change of address request is successfully processed, confrimation email will be sent you with more details. Thanks'
                            }
                        }
                    };
                    
                    callback(null, response);
                }
            });
            
        } else {
            console.log('else');
            callback(null, response);
        }
        break;
    }
};
//Function used to generate a response object, with its attribute dialogAction.fulfillmentState set to 'Fulfilled'. It also receives the message string to be shown to the user.
function createFulfilledResponse(sessionAttributes, message, intentName, slots, slotToElicit) {
    let response = {
        sessionAttributes: sessionAttributes,
        dialogAction: {
            type: "ElicitSlot",
            message: {
                contentType: "PlainText",
                content: message
            },
            intentName: intentName,
            slots: slots,
            slotToElicit: slotToElicit
        }
    }
    return response;
}
//Function used to generate a response object, with its attribute dialogAction.fulfillmentState set to 'Failed'. It also receives the message string to be shown to the user.
function createFailedResponse(sessionAttributes, message) {
    let response = {
        sessionAttributes: sessionAttributes,
        dialogAction: {
            type: "Close",
            fulfillmentState: "Failed",
            message: {
                contentType: "PlainText",
                content: message
            }
        }
    }
    return response;
}

function findCurrentSlot(slots) {
    //&& slots.HowzHelp == null
    if (slots.CustomerType != null && slots.FirstName != null && slots.LastName != null && slots.EmailId == null && slots.Address == null && slots.VehicleYear == null && slots.VehicleMake == null && slots.VehicleModel == null && slots.VehicleSeries == null && slots.VehicleMileage == null && slots.VehicleUsage == null && slots.VehicleMiles == null && slots.Gender == null && slots.MaritalStatus == null && slots.ViolationConvicted == null && slots.RoadAccident == null && slots.InsClaimed == null) {
        return "EmailId"
    } else if (slots.CustomerType != null && slots.FirstName != null && slots.LastName != null && slots.EmailId != null && slots.Address != null && slots.VehicleYear == null && slots.VehicleMake == null && slots.VehicleModel == null && slots.VehicleSeries == null && slots.VehicleMileage == null && slots.VehicleUsage == null && slots.VehicleMiles == null && slots.Gender == null && slots.MaritalStatus == null && slots.ViolationConvicted == null && slots.RoadAccident == null && slots.InsClaimed == null) {
        return "Address"
    } else {
        return null;
    }
}
