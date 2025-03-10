let startIndex = 0;
let firstID = 0;
let lastID = 0;
let pollPageNumber = 0;
let pollMaxPageNumber = 1; 
let jobPageNumber = 0;
let jobMaxPageNumber = 1; 
const batchSize = 10;
const url = "https://hacker-news.firebaseio.com/v0/";
const container = document.getElementById("cards-container");
const loadMoreButton = document.getElementById("loadMore");


// Set to store IDs of failed fetches (unique values)
let failedIds = new Set();
let addedID = new Set();
let allFetchedItems = [];
let allFetchedPolls = [];
let allFetchedJobs = [];


async function fetchingData(url){
    return fetch(url).then(res => res.ok ? res.json() : null).catch(() => null);
}

async function fetchPolls() {
    let fetchPromises = [];
    if (pollPageNumber <= pollMaxPageNumber){
        const polls = await fetchingData(`https://hn.algolia.com/api/v1/search_by_date?page=${pollPageNumber}&tags=poll`)
        const objectIDs = polls.hits.map(hit => hit.objectID);
        pollMaxPageNumber = polls.nbPages;
        pollPageNumber++;
        for(let id of objectIDs){
            fetchPromises.push(fetch(url+`item/${id}.json`).then(res => res.ok ? res.json() : null).catch(() => null));
        }
    
    const results = await Promise.allSettled(fetchPromises);
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const item = result.value;
            if (!item.deleted && !item.dead && item.type === "poll") {
                allFetchedPolls.push(item); 
            }
        }
    });
    allFetchedPolls.sort((a, b) => b.time - a.time);


    renderItems(allFetchedPolls);
    }
}

async function fetchJobs() {
    let fetchPromises = [];
    if (jobPageNumber <= jobMaxPageNumber){
        const jobs = await fetchingData(`https://hn.algolia.com/api/v1/search_by_date?page=${jobPageNumber}&tags=job`)
        const objectIDs = jobs.hits.map(hit => hit.objectID);
       jobMaxPageNumber = jobs.nbPages;
        jobPageNumber++;
        for(let id of objectIDs){
            fetchPromises.push(fetch(url+`item/${id}.json`).then(res => res.ok ? res.json() : null).catch(() => null));
        }
    
    const results = await Promise.allSettled(fetchPromises);
    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const item = result.value;
            if (!item.deleted && !item.dead && item.type === "job") {
                allFetchedJobs.push(item); 
            }
        }
    });
    allFetchedJobs.sort((a, b) => b.time - a.time);

    renderItems(allFetchedJobs);
    }
}

async function fetchStories() {
    let fetchPromises = [];
    let newID = await fetchingData(url + "newstories.json");
    let size = newID.length;
    let flagnewID = false;
    if (firstID !== newID[0] && lastID !== 0){
        flagnewID = true;
    }
    firstID = newID[0];
    if (lastID === 0){
        lastID = newID[size - 1];
    }
    
    failedIds.forEach(value => {
        const url = `https://hacker-news.firebaseio.com/v0/item/${value}.json`;
        fetchPromises.push(fetch(url).then(res => res.ok ? res.json() : null).catch(() => null));
    });

    if (size > startIndex){
        let finalID = startIndex + batchSize;
        for (let i = startIndex; i < finalID; i++) {
            if(!addedID.has(newID[i])){
                const url = `https://hacker-news.firebaseio.com/v0/item/${newID[i]}.json`;
                fetchPromises.push(fetch(url).then(res => res.ok ? res.json() : null).catch(() => null));
            }
        }
    } else {
        let finalID = Math.max(1, lastID - batchSize);
        for (let i = lastID; i > finalID && i > 0; i--) {
            if(!addedID.has(i)){
                const url = `https://hacker-news.firebaseio.com/v0/item/${i}.json`;
                fetchPromises.push(fetch(url).then(res => res.ok ? res.json() : null).catch(() => null));
            }
        }
        lastID -= batchSize;
    }
    if (flagnewID){
        let i = 0;
        while(!addedID.has(newID[i]) && i < size){
            const url = `https://hacker-news.firebaseio.com/v0/item/${newID[i]}.json`;
            fetchPromises.push(fetch(url).then(res => res.ok ? res.json() : null).catch(() => null));
            i++;
        }
    }

    const results = await Promise.allSettled(fetchPromises);

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const item = result.value;
            if (!item.deleted && !item.dead && item.type === "story") {
                allFetchedItems.push(item);
                failedIds.delete(item.id); 
            }
            addedID.add(item.id);
        } else {

            const failedId = result.reason ? result.reason.id : null;
            if (failedId) {
                failedIds.add(failedId);
            }
        }
    });

    allFetchedItems.sort((a, b) => b.time - a.time);

    renderItems(allFetchedItems);

    startIndex += batchSize;
}

function renderItems(items) {
    container.innerHTML = ""; // Clear the container before re-rendering

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <h2>${item.title}</h2>
            <p>Type: ${item.type}</p>
            <p>Created by: ${item.by}</p>
            <p>Date: ${new Date(item.time * 1000).toLocaleString()}</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `detail.html?id=${item.id}`;
        });
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

// Load more when the user clicks the button
loadMoreButton.addEventListener("click", ()=>{
    changeContent(getURL());
});
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight-10) {
        changeContent(getURL());
    }
});


window.addEventListener('popstate', () => {
    changeContent(getURL(),true);
});


function changeContent(type , isToggeld = false) {
    // Update the URL query parameter without reloading
    history.pushState({}, '', `?type=${type}`);
    

    // Load new content based on type
    if (type === 'stories') {
        if(isToggeld){
            startIndex = 0;
            firstID = 0;
            lastID = 0;
            allFetchedItems = [];
            failedIds = new Set();
            addedID = new Set();
        }
        fetchStories();
    } else if (type === 'jobs') {
        if(isToggeld){
            jobPageNumber = 0;
            jobMaxPageNumber = 1;
            allFetchedJobs = [];
        }
        fetchJobs(); 
    } else if (type === 'polls') {
        if(isToggeld){
            pollPageNumber = 0;
            pollMaxPageNumber = 1;
            allFetchedPolls = [];
        }
        fetchPolls();
    }
}
const throttledFetchupdates = throttle(fetchUpdates, 5000);
const updatesUrl = "https://hacker-news.firebaseio.com/v0/updates.json";

async function fetchUpdates() {
    console.log("i have been called", Date.now().toLocaleString());

    try {
        const response = await fetch(updatesUrl);
        const data = await response.json();
        const freshUpdates = data.items;
        const profiles = data.profiles;
        renderUpdates(freshUpdates,false);
        renderUpdates(profiles, true);
    }
    catch (error) {
        console.error(error);
    }
}
setInterval(()=>{
    const updatesContainer = document.getElementById("updates-list");
    updatesContainer.innerHTML = "";
}, 30000);
 function renderUpdates(UpdatedInformation, IsProfile){
    const updatesContainer = document.getElementById("updates-list");
    UpdatedInformation.forEach(ID => {
            let existing = document.querySelector(`#updates-list li[data-id="${ID}"]`);
            if (IsProfile){
                existing = document.querySelector(`#updates-list li[data-profile="${ID}"]`);
            }
            if (!existing) {
                const li = document.createElement("li");
                if(IsProfile){
                    li.setAttribute("data-profile",ID);
                    li.textContent = `Profile: ${ID}`;
                } else{
                    li.setAttribute("data-id", ID); 
                }
                updatesContainer.append(li);
                if(!IsProfile){
                    handleParentRedirection(ID, li);
                }
            }
    });
}
document.addEventListener("DOMContentLoaded", () => {
    setInterval(throttledFetchupdates, 5000);
    type = getURL();
    changeContent(type);

});

function getURL(){
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type'|| 'stories');
    if (type === null){
        return 'stories';
    }
    return type;
}

function throttle(func, limit) {
    let lastCall = 0;
    let timeout;

    return function (...args) {
        const now = Date.now();
        const remainingTime = limit - (now - lastCall);

        if (remainingTime <= 0) {
            lastCall = now;
            func.apply(this, args);
        } else {
            console.log("i am here", Date.now().toLocaleString());
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
            }, remainingTime);
        }
    };
}

async function findTheParent(id) {
    let item = await fetchingData(url+`item/${id}.json`);
    if (item.deleted || item.dead){
        return -1;
    } else if (item.type === "comment" || item.type === "pollopt"){
        if (item.parent === undefined){
            return -1;
        }
        parentID = findTheParent(item.parent);
        return parentID;
    } else {
        return id;
    }
}
async function handleParentRedirection(ID, li) {
    const parentID = await findTheParent(ID);
    if (parentID !== -1 && parentID !== null) {
        let link = document.createElement('a');
        link.href = `detail.html?id=${parentID}`; // Correct link format
        link.textContent = `Item ID: ${ID}`;
        link.style.textDecoration = 'none'; // Optional: Remove underline
        link.style.color = 'inherit'; // Optional: Keep default li color
        li.innerHTML = '';
        li.appendChild(link); // Add the link inside the <li>
    }
}
