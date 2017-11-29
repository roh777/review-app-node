function autocomplete(input, latInput, lngInput) {
    if(!input) return;
    //skip if there is no input on the page
    //this is part of google autocomplete api
    const dropdown = new google.maps.places.Autocomplete(input);

    dropdown.addListener('place_changed', () => {
        const place = dropdown.getPlace();
        console.log(place);
        latInput.value = place.geometry.location.lat();
        lngInput.value = place.geometry.location.lng();

    });
    //don't submit form on enter
    input.on('keydown', (e)=> {
        if(e.keyCode === 13) {
            e.preventDefault();
        }
    });
}

export default autocomplete;