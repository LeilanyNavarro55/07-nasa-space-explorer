// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const imageModal = document.getElementById('imageModal');
const modalContent = document.getElementById('modalContent');
const closeModalButton = document.getElementById('closeModalButton');
// Replace DEMO_KEY with your own key from https://api.nasa.gov/ to avoid the shared demo-key limit.
const nasaApiKey = 'DEMO_KEY';
let apodImages = [];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Fetch and display Astronomy Picture of the Day entries for the selected dates
getImagesButton.addEventListener('click', getSpaceImages);
gallery.addEventListener('click', handleGalleryClick);
gallery.addEventListener('keydown', handleGalleryKeydown);
closeModalButton.addEventListener('click', () => imageModal.close());

imageModal.addEventListener('click', (event) => {
	if (event.target === imageModal) {
		imageModal.close();
	}
});

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		gallery.innerHTML = '<p class="placeholder">Choose a valid date range.</p>';
		return;
	}

	const parameters = new URLSearchParams({
		api_key: nasaApiKey,
		start_date: startDate,
		end_date: endDate,
		thumbs: 'true'
	});

	gallery.innerHTML = '<p class="placeholder">Loading space images...</p>';
	getImagesButton.disabled = true;

	try {
		const response = await fetch(`https://api.nasa.gov/planetary/apod?${parameters}`);

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('NASA API rate limit reached. Wait and try again, or replace nasaApiKey in js/script.js with your own key from https://api.nasa.gov/.');
			}

			throw new Error('NASA could not load images for those dates. Please try again.');
		}

		const images = await response.json();
		apodImages = images;
		gallery.innerHTML = apodImages.map(createImageCard).join('');
	} catch (error) {
		gallery.innerHTML = `<p class="placeholder">${error.message}</p>`;
	} finally {
		getImagesButton.disabled = false;
	}
}

function createImageCard(image) {
	const imageUrl = image.media_type === 'video' ? image.thumbnail_url : image.url;
	const media = imageUrl
		? `<img src="${imageUrl}" alt="${image.title}" loading="lazy">`
		: '<p>NASA video</p>';
	const imageIndex = apodImages.indexOf(image);

	return `
		<article class="gallery-item" data-image-index="${imageIndex}" role="button" tabindex="0" aria-label="View details for ${image.title}">
			${media}
			<p><strong>${image.title}</strong></p>
			<p>${image.date}</p>
		</article>
	`;
}

function handleGalleryClick(event) {
	const galleryItem = event.target.closest('.gallery-item');

	if (galleryItem) {
		openImageModal(apodImages[galleryItem.dataset.imageIndex]);
	}
}

function handleGalleryKeydown(event) {
	if (event.key === 'Enter' || event.key === ' ') {
		const galleryItem = event.target.closest('.gallery-item');

		if (galleryItem) {
			event.preventDefault();
			openImageModal(apodImages[galleryItem.dataset.imageIndex]);
		}
	}
}

function openImageModal(image) {
	modalContent.replaceChildren();

	const imageUrl = image.media_type === 'video'
		? image.thumbnail_url
		: image.hdurl || image.url;

	if (imageUrl) {
		const imageElement = document.createElement('img');
		imageElement.className = 'modal-image';
		imageElement.src = imageUrl;
		imageElement.alt = image.title;
		modalContent.append(imageElement);
	}

	const title = document.createElement('h2');
	title.id = 'modalTitle';
	title.textContent = image.title;
	modalContent.append(title);

	const date = document.createElement('p');
	date.className = 'modal-date';
	date.textContent = image.date;
	modalContent.append(date);

	const explanation = document.createElement('p');
	explanation.className = 'modal-explanation';
	explanation.textContent = image.explanation;
	modalContent.append(explanation);

	if (image.media_type === 'video') {
		const videoLink = document.createElement('a');
		videoLink.href = image.url;
		videoLink.target = '_blank';
		videoLink.rel = 'noopener';
		videoLink.textContent = 'Open NASA video';
		modalContent.append(videoLink);
	}

	imageModal.showModal();
}
