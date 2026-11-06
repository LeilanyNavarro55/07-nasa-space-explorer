// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const spaceFact = document.getElementById('spaceFact');
const imageModal = document.getElementById('imageModal');
const modalContent = document.getElementById('modalContent');
const closeModalButton = document.getElementById('closeModalButton');
const apodApiUrl = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';
const apodPageSize = 25;
let apodImages = [];

// Choose one space fact to show each time the page loads.
const spaceFacts = [
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'A day on Venus is longer than a year on Venus.',
	'The Moon moves about 3.8 centimeters farther from Earth each year.',
	'Mars is home to Olympus Mons, the tallest volcano in the solar system.'
];
const randomFactIndex = Math.floor(Math.random() * spaceFacts.length);
spaceFact.textContent = spaceFacts[randomFactIndex];

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

	gallery.innerHTML = '<p class="placeholder">Loading space images...</p>';
	getImagesButton.disabled = true;

	try {
		const today = new Date().toISOString().split('T')[0];
		const daysBeforeEndDate = Math.floor(
			(Date.parse(`${today}T00:00:00Z`) - Date.parse(`${endDate}T00:00:00Z`)) / 86400000
		);
		let page = Math.max(1, Math.floor(daysBeforeEndDate / apodPageSize) + 1);
		apodImages = [];

		while (true) {
			const response = await fetch(`${apodApiUrl}?page=${page}`);

			if (!response.ok) {
				throw new Error('NASA could not load images for those dates. Please try again.');
			}

			const pageImages = await response.json();

			if (!Array.isArray(pageImages)) {
				throw new Error('NASA returned an unexpected response. Please try again.');
			}

			if (pageImages.length === 0) {
				break;
			}

			const newestDate = pageImages[0].date;
			const oldestDate = pageImages[pageImages.length - 1].date;

			if (oldestDate > endDate) {
				page++;
				continue;
			}

			if (newestDate < startDate) {
				if (apodImages.length > 0) break;
				page--;
				if (page < 1) break;
				continue;
			}

			apodImages.push(...pageImages.filter(image =>
				image.date >= startDate && image.date <= endDate
			));

			if (oldestDate <= startDate) {
				break;
			}

			page++;
		}

		if (apodImages.length === 0) {
			gallery.innerHTML = '<p class="placeholder">No APOD images were found for those dates.</p>';
			return;
		}

		apodImages.reverse();
		gallery.innerHTML = apodImages.map(createImageCard).join('');
	} catch (error) {
		gallery.innerHTML = `<p class="placeholder">${error.message}</p>`;
	} finally {
		getImagesButton.disabled = false;
	}
}

function createImageCard(image) {
	const isVideo = image.media_type === 'video';
	const imageUrl = isVideo ? image.hdurl : image.hdurl || image.url;
	let media;
	if (imageUrl) {
		media = `<img src="${imageUrl}" alt="${image.title}" loading="lazy">`;
	} else if (isVideo) {
		media = '<p>Video entry</p>';
	} else {
		media = '<p>Image unavailable</p>';
	}
	const imageIndex = apodImages.indexOf(image);

	if (isVideo) {
		return `
			<article class="gallery-item">
				${media}
				<p><strong>${image.title}</strong></p>
				<p>${image.date}</p>
				<a class="video-link" href="${image.url}" target="_blank" rel="noopener">
					Watch video on NASA
				</a>
			</article>
		`;
	}

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

	if (galleryItem && galleryItem.dataset.imageIndex !== undefined) {
		openImageModal(apodImages[galleryItem.dataset.imageIndex]);
	}
}

function handleGalleryKeydown(event) {
	if (event.key === 'Enter' || event.key === ' ') {
		const galleryItem = event.target.closest('.gallery-item');

		if (galleryItem && galleryItem.dataset.imageIndex !== undefined) {
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
	explanation.textContent = new DOMParser()
		.parseFromString(image.explanation || '', 'text/html')
		.body.textContent;
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
