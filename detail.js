const url = "https://hacker-news.firebaseio.com/v0/"

function getStoryId() {
    const parameter = new URLSearchParams(window.location.search);
    return parameter.get('id');
}

const storyId= getStoryId();
console.log(storyId);

fetchStoryDetails(storyId).then(story => {
    if (story) {
        renderStoryDetails(story);
    }
}).catch(error => {
    console.error(error);
});

async function fetchStoryDetails(storyId) {
    const storyUrl = `${url}item/${storyId}.json?print=pretty`;
    try{
        const respons = await fetch(storyUrl);
        const storyParams = await respons.json();
        return storyParams;
    } catch (error) {
        console.error(error);
    }
}

function renderStoryDetails(story) {
 
    const titleElement = document.getElementById("story-title");
    const authorElement = document.getElementById("story-author");
    const scoreElement = document.getElementById("story-score");
    const timeElement = document.getElementById("story-time");
    if (story.url){
        const linkElement = document.getElementById("story-link");
        linkElement.innerHTML = `Link: <a href="${story.url}" target="_blank">${story.url}</a>`;
    }
    if (story.type === "poll"){
        console.log(story.type);
        renderPollOptions(story);
    }
    // Update the elements with data from the story
    titleElement.innerHTML = `<a href="${story.url}" target="_blank">${story.title}</a>`;
    authorElement.innerHTML = `Author: ${story.by}`;
    scoreElement.innerHTML = `Score: ${story.score}`;
    timeElement.innerHTML = `Time created: ${new Date(story.time * 1000).toLocaleString()}`; // Format time

    
    renderComments(story);
}

// function capitalizeAuthor(name) { // Proper format of the name.
//     const splitName = name.split(' ');

//     return splitName.map(word => {
//         return word.charAt(0).toUpperCase()+ ". " + word.charAt(1).toUpperCase() + word.slice(2).toLowerCase();
//     }).join(' '); 
// }

function renderComments(story) {
    const commentsContainer = document.getElementById("comments-container");
    if (!story.kids || story.kids.length === 0 || story.descendents === 0) {
        commentsContainer.innerHTML = "<h3>No comments available</h3>";
        return;
    }

    commentsContainer.innerHTML = "<h3>Comments:<h3>";

    Promise.all(story.kids.map(fetchComment))
        .then(comments => comments.forEach(comment => renderEachComment(comment, commentsContainer)))
        .catch(error => console.error(error));
    };

async function fetchComment(commentId){
    const response = await fetch(`${url}item/${commentId}.json`);
    return await response.json();
}

function renderEachComment(comment, container) {
    if (!comment || comment.delete || comment.dead || !comment.by) return;

    const commentElement = document.createElement('div');
    commentElement.classList.add('comment');

    const commentTime = new Date(comment.time * 1000).toLocaleString();
    commentElement.innerHTML = `
        <div class="comment-content">
            <strong>${comment.by}</strong> commented: <em>${commentTime}</em>
        </div>
        <div class="comment-body">
            <p>${comment.text}</p>
        </div>
    `;
    if (comment.kids && comment.kids.length > 0) { 
        const replyContainer = document.createElement('div');
        replyContainer.classList.add('reply-container');
        for (let replyId of comment.kids) {
           fetchComment(replyId).then(reply => renderEachComment(reply, replyContainer));
        }
        commentElement.appendChild(replyContainer);

    }

   container.appendChild(commentElement);
}
async function renderPollOptions(poll) {
    const pollContainer = document.createElement("div");
    pollContainer.classList.add("poll-container");

    if (!poll.parts || poll.parts.length === 0) {
        pollContainer.innerHTML = "<p>No poll options available.</p>";
        return;
    }

    // Fetch all poll options
    let pollOptions = await Promise.all(
        poll.parts.map(async (id) => {
            const response = await fetch(`${url}item/${id}.json`);
            return await response.json();
        })
    );

    // Filter out deleted or dead options
    pollOptions = pollOptions.filter(option => !option.deleted && !option.dead);
    if (pollOptions.length === 0) {
        pollContainer.innerHTML = "<p>No valid poll options available.</p>";
        return;
    }

    // Sort options by score (votes) and then by time (newest first)
    pollOptions.sort((a, b) => b.score - a.score || b.time - a.time);

    // Calculate total votes from valid options
    const totalVotes = pollOptions.reduce((sum, option) => sum + option.score, 0) || 1; // Avoid division by zero

    // Render poll options
    pollOptions.forEach((option) => {
        const percentage = ((option.score / totalVotes) * 100).toFixed(1);

        const optionDiv = document.createElement("div");
        optionDiv.classList.add("poll-option");

        optionDiv.innerHTML = `
            <div class="option-text">${option.text}</div>
            <div class="progress-bar">
                <div class="progress" style="width: ${percentage}%;"></div>
            </div>
            <div class="vote-info">
                <span>${option.score} votes</span> | <span>${percentage}%</span>
            </div>
        `;

        pollContainer.appendChild(optionDiv);
    });

    // Insert before comments
    const commentsContainer = document.getElementById("comments-container");
    document.body.insertBefore(pollContainer, commentsContainer);
}

function goBack() {
    window.location.href = 'index.html?type=stories';
  }
    const backButton = document.getElementById('back-to-main');
    if (backButton) {
      backButton.addEventListener('click', goBack);
    };