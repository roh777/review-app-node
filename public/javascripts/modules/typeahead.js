const axios = require('axios');

function searchResultHTML(stores) {
    return stores.map(store => {
        return `
        <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
        </a>
        `;
    }).join('');
}

function typeAhead(search) {
    if(!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResult = search.querySelector('.search__results');


    searchInput.on('input', function () {
        //if there is no char then clear results
        if(!this.value) {
            searchResult.style.display = 'none';
            return;
        }
        //show search the results
        searchResult.style.display = 'block';
        axios
        .get(`/api/search?q=${this.value}`)
        .then(res => {
            if(res.data.length) {
                console.log('There is something to show');
                searchResult.innerHTML = searchResultHTML(res.data);
            }
        })
        .catch( err => {
            console.error(err);
        })
    });

    //handle keyboards input
    searchInput.on('keyup', (e) => {
        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');

        if(![38, 40, 13].includes(e.keyCode)) return; //ignore
         

        //find the next result to be highlighted
        let next;
        if(e.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0];
        }
        else if(e.keyCode === 40) {
            next = items[0];
        }
        else if(e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length - 1];
        } 
        else if(e.keyCode === 38) {
            next = items[items.length - 1];
        } //if pressed enter for a link
        else if(e.keyCode === 15 && current.href) {
            window.location = current.href;
            return;
        }
        console.log(current);
        if(current) current.classList.remove(activeClass);
        next.classList.add(activeClass);
       // console.log(next);

    });
}

export default typeAhead;