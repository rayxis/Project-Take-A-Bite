class takeABite {
	// API URLs
	apis      = {
		apiNinjas:    new URL('https://api.api-ninjas.com/v1/quotes'),
		recipeInfo:   'https://api.spoonacular.com/recipes',
		recipeSearch: new URL('https://api.spoonacular.com/recipes/complexSearch')
	};
	// Data Storage
	data      = {
		apiKeys:       {},  // API keys. Filled by constructor.
		favorites:     [],  // Favorite's array
		functions:     [],  // Events functions list
		searchHistory: []   // Search history
	};
	// Elements
	elements  = {
		favoritesClearButton: document.querySelector('#clear-favorites'),  	 // Favorites clear button
		favoritesList:        document.querySelector('#favorites-list'),   	 // Favorites list
		favoritesShowButton:  document.querySelector('#show-favorites'),   	 // Favorites show button
		historyClearButton:   document.querySelector('#clear-history'),    	 // History clear button
		landingContainer:     document.querySelector('#landing-container'),  // Landing container
		noFavorites:          document.querySelector('#no-favorites'),		 // No favorites text
		recipeCard:           document.querySelector('#recipe-card'),        // Recipe view
		recipeDirectionList:  document.querySelector('#recipe-directions'),  // Recipe ingredient list
		recipeImage:          document.querySelector('#recipe-image'),       // Recipe image
		recipeIngredientList: document.querySelector('#recipe-ingredients'), // Recipe ingredient list
		recipeTitle:          document.querySelector('#recipe-title'),       // Recipe title
		searchButton:         document.querySelector('#search-button'),    	 // Search button
		searchHistory:        document.querySelector('#search-history'),   	 // Search history list
		searchInput:          document.querySelector('#search-recipe'),    	 // Search recipe input
		searchResults:        document.querySelector('#search-results'),     // Search results list
		quote:                document.querySelector('#quote'),				 // Food quote
		quoteAuthor:          document.querySelector('#quote-author')		 // Food quote author
	};
	// Errors
	errors    = {
		searchInputEmpty: 'You must enter text.'
	};
	// Settings
	settings  = {
		cacheSearchHistoryKey: 'searchHistory',    // Search history cache key
		cacheFavoritesKey:     'favorites'         // Favorites cache key
	};
	// Element templates
	templates = {
		favoritesListItem:    document.querySelector('#favorites-list-item').content,
		recipeDirectionItem:  document.querySelector('#recipe-directions-item').content,
		recipeIngredientItem: document.querySelector('#recipe-ingredient-item').content,
		searchResultsItem:    document.querySelector('#search-results-item').content,
		searchHistoryItem:    document.querySelector('#search-history-item').content
	};

	constructor() {
		// Load the API key
		this.data.apiKeys = apiKeys;

		// Load the random food quote and cache.
		this.quoteFetch();
		this.apiCacheLoad('searchHistory');
		this.apiCacheLoad('favorites');

		// Initialize event listeners
		this.initializeEventListeners();

		// Initialize Foundation
		$(document).foundation();
	}

	// Initialize event listeners for the UI
	initializeEventListeners() {
		this.elements.searchButton.addEventListener('click', this.recipeSearch.bind(this));

		// Event listener for clearing search history
		this.eventClickSave(this.elements.historyClearButton, 'clearHistory', () => this.recipeHistoryClear());

		// Event listener for showing favorites
		this.eventClickSave(this.elements.favoritesShowButton, 'showFavorites', () => this.showFavorites());

		// Event listener for clearing favorites
		this.eventClickSave(this.elements.favoritesClearButton, 'clearFavorites', () => this.clearFavorites());
	}

	/***
	 * API Functions
	 ***/

	// Load the search history cache
	apiCacheLoad(type) {
		try {
			switch (type) {
				case 'favorites':
					// Load favorites into the data storage
					this.data.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
					break;
				case 'searchHistory':
					// Pull the searchHistory from localStorage and parse it into an array. If this is unsuccessful,
					// use the default value (or any other value) in searchHistory.
					this.data.searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
					this.recipeHistoryList();
					break;
				default:
					// If trying to load a cache that isn't defined, throw an error.
					throw new Error(`Invalid data cache type used: "$type"`);
			}
		} catch (error) {
			console.log('apiCacheLoad failure:', error);
			return false;
		}
	}

	// Cache the search history
	apiCacheSave(type) {
		let apiData, cacheKey;
		try {
			if (!this.data[type]) throw new Error(`Data "${type}" does not exist.`);

			switch (type) {
				case 'favorites':
					// Cache favorites
					cacheKey = this.settings.cacheFavoritesKey;
					apiData  = JSON.stringify(this.data.favorites);
					break;
				case 'searchHistory':
					// Cache search history
					cacheKey = this.settings.cacheSearchHistoryKey;
					apiData  = JSON.stringify(this.data.searchHistory);
					break;
				// An invalid type was specified.
				default:
					throw new Error(`Invalid data cache type used: "${type}"`);
			}
			// Turn the array data into a string for storage
			apiData = JSON.stringify(this.data[type]);

			// If the data was successfully converted to an array, save it and check the integrity.
			if (apiData) {
				localStorage.setItem(cacheKey, apiData);
				if (apiData === localStorage.getItem(cacheKey)) return true;
			}

		} catch (error) {
			// If JSON conversion was unsuccessful, or the data did not save properly, something broke.
			console.log('apiCacheSave error:', error);
		}
		return false;
	}

	// Handler for API fetch requests, with optional header and callback function for handling asynchronous requests.
	async apiFetchJSON(apiData) {
		// Default fetch data, then append anything that was specified.
		const fetchObject = {
			url:      undefined,
			callback: undefined,
			...apiData,
			headers: {headers: apiData.headers ?? {}}
		};

		try {
			// Fetch data from the specified URL, and then return it.
			const response = await fetch(fetchObject.url, fetchObject.headers);

			// If the response is not okay, throw an error.
			if (!response.ok) throw new Error('networkError');

			// If a callback was provided, return the value from that, otherwise return the parsed response.
			else return fetchObject.callback
			            ? response.json().then(response => fetchObject.callback(response))
			            : response.json();
		} catch (error) {
			console.log('apiFetchJSON error:', error);
		}
	}

	/***
	 * Event Functions
	 ***/

	// Remove all children and their click events from the specified parent element.
	eventClickChildrenRemove(element, funcName) {
		[...element.children].forEach(child => {
			this.eventClickRemove(child, funcName);
			child.remove();
		});
	}

	// Remove a click event.
	eventClickRemove(element, funcName) {
		// If the function name exists in the array, grab it; otherwise check if it's an actual function, and save that.
		// This is so that even if the event wasn't created with eventClickSave(), it can still save code.
		const func = this.data.functions[funcName] ?? (typeof funcName === 'function') ? funcName : false;
		// If the function is not a function, abort.
		if (!func) return false;

		// Remove the event listener from the element.
		element.removeEventListener('click', this.data.functions[funcName]);
		return true;
	}

	// Save the function for future removal.
	eventClickSave(element, funcName, func) {
		// If the eventFunctionSave failed, also fail.
		if (!this.eventFunctionSave(funcName, func)) return false;

		// Save the event handler.
		element.addEventListener('click', func);
		// Return the function.
		return func;
	}

	// Save functions for future reference.
	eventFunctionSave(funcName, func) {
		try {
			// If the function is not a function, abort.
			if (typeof func !== 'function') throw new Error('This is not a function.');

		} catch (error) {
			console.log('eventFunctionSave error:', error);
			return false;
		}

		// If the function isn't saved, save it.
		if (!this.data.functions[funcName]) this.data.functions[funcName] = func;

		// Return the saved function.
		return this.data.functions[funcName];
	}

	/***
	 * Favorites Functions
	 ***/

	// Method to clear favorites
	clearFavorites() {
		// Clear favorites array, and set innerHTML.
		this.data.favorites                 = [];
		this.elements.noFavorites.innerHTML = 'You do not have any favorites saved.</br> Please browse recipes and like your favorites.';

		// Save changes.
		this.apiCacheSave('favorites');
	}

	// Checks if a recipe is a favorite by id
	isFavorite(recipeID) {
		return this.data.favorites.includes(recipeID);
	}

	// Method to refresh the favorites list in the modal without closing it
	refreshFavoritesModal() {
		const modalFavoritesList = document.getElementById('modal-favorites-list');
		this.eventClickChildrenRemove(modalFavoritesList, 'favoriteItemClick');

		// Repopulate the modal favorites list
		this.data.favorites.forEach(favorite => {
			// Clone the list item element, and load references.
			const card           = this.templates.favoritesListItem.cloneNode(true).firstElementChild;
			const favoriteButton = card.querySelector('.favorite-button');
			const favoriteImage  = card.querySelector('.search-image');
			const recipe         = this.data.searchHistory.flatMap(recipeList => recipeList.results).find(recipe => recipe.id === favorite);

			// Set the image data
			favoriteImage.src = recipe.image;
			favoriteImage.alt = recipe.title;
			// Title
			card.querySelector('.search-title').textContent = recipe.title;

			// Favorite button content and action.
			favoriteButton.textContent = '💔';
			this.eventClickSave(favoriteButton, 'favoriteItemClick', this.toggleFavorite.bind(this, recipe));

			// Add the item to the list
			modalFavoritesList.appendChild(card);
		});
	}

	// Method to show the favorites list
	showFavorites() {
		const modalFavoritesList = document.getElementById('modal-favorites-list');
		// Clear the list
		this.eventClickChildrenRemove(modalFavoritesList, 'favoriteItemClick');

		// Populate the modal favorites list
		this.data.favorites.forEach(favorite => {
			// Flatten the recipe results list into a single array, and finding the favorite match.
			const recipe = this.data.searchHistory.flatMap(recipeList => recipeList.results).find(recipe => recipe.id === favorite);

			// Clone the favorite list item template
			const card           = this.templates.favoritesListItem.cloneNode(true).firstElementChild;
			const favoriteButton = card.querySelector('.favorite-button');
			const favoriteImage  = card.querySelector('.search-image');

			// Fill in the image
			favoriteImage.src                               = recipe.image;
			favoriteImage.alt                               = recipe.title;
			// Title
			card.querySelector('.search-title').textContent = recipe.title;

			// Add an event listener to the recipe item
			this.eventClickSave(card, 'recipeBuild', (event) => {
				this.recipeViewOpen.bind(this, recipe)(event);
				modal.close();
			});

			// Set button content and action
			favoriteButton.textContent = '❤️'; // Change to heart icon
			this.eventClickSave(favoriteButton, 'favoriteItemClick', (event) => {
				this.toggleFavorite.bind(this, recipe)(event);
				event.stopPropagation();
			});

			// Append the card to the modal list
			modalFavoritesList.appendChild(card);
		});

		// Open the modal
		const modal = new Foundation.Reveal($('#favorites-modal'));
		modal.open();
	}

	// Toggles the favorite status of a recipe
	toggleFavorite(recipe, event) {
		this.elements.noFavorites.textContent = '';

		const heartIcon           = event.target; // Assuming event.target is the heart icon
		const isCurrentlyFavorite = this.isFavorite(recipe.id);

		// Update the favorites array
		if (isCurrentlyFavorite) {
			this.data.favorites   = this.data.favorites.filter(fav => fav !== recipe.id);
			heartIcon.textContent = '💔'; // Change to broken heart icon
		} else {
			this.data.favorites.push(recipe.id);
			heartIcon.textContent = '❤️'; // Change to heart icon
		}
		// Update the modal list without closing it, and save changes.
		this.refreshFavoritesModal();
		this.apiCacheSave('favorites');
	}

	/***
	 * Quote Function
	 ***/

	// Fetch a random food quote.
	quoteFetch() {
		const url = this.apis.apiNinjas;

		// Set search category to food.
		url.searchParams.set('category', 'food');

		// Fetch a quote from API Ninjas.
		this.apiFetchJSON({
			                  url:      url,
			                  headers:  {'X-Api-Key': this.data.apiKeys.apiNinjas},
			                  callback: quote => {
				                  this.elements.quote.textContent       = quote[0].quote;
				                  this.elements.quoteAuthor.textContent = `— ${quote[0].author}`;
			                  }
		                  });
	}

	/***
	 * Recipe Functions
	 ***/

	// Clears the recipe history from localStorage, and the array.
	recipeHistoryClear() {
		// Clear the searchHistory array, save the cache and clear the history list.
		this.data.searchHistory = [];
		this.apiCacheSave('searchHistory');
		this.eventClickChildrenRemove(this.elements.searchHistory, 'historyBuild');
	}

	// Fill the
	recipeHistoryList() {
		// Empty the list and remove the event listeners.
		this.eventClickChildrenRemove(this.elements.searchHistory, 'historyBuild');

		// Function to build search history list items.
		const historyBuild = search => {
			const searchElement       = this.templates.searchHistoryItem.cloneNode(true).firstElementChild;
			searchElement.textContent = search.searchQuery;

			// Add an event listener to the recipe list item
			this.eventClickSave(searchElement, 'historyBuild', (event) => {
				this.recipeViewClose();
				// Set the search box with the search text, and then click the search button.
				this.elements.searchInput.value = event.target.textContent;
				this.elements.searchButton.click();
			});

			// Return the element
			return searchElement;
		};

		// Loop through the search history and add items
		this.data.searchHistory.forEach(
			recipe => this.elements.searchHistory.prepend(historyBuild(recipe)));
	}

	recipeResultList(recipeData) {
		// Remove all the children elements.
		this.eventClickChildrenRemove(this.elements.searchResults, 'recipeBuild');
		this.recipeViewClose();

		const recipeItemBuild = recipe => {
			// Clone the search list item and load references
			const recipeElement  = this.templates.searchResultsItem.cloneNode(true).firstElementChild;
			const recipeImage    = recipeElement.querySelector('.search-image');
			const recipeTitle    = recipeElement.querySelector('.search-title');
			const favoriteButton = recipeElement.querySelector('.favorite-button');

			// Set the recipe title
			recipeTitle.textContent = recipe.title;

			// Add the image location and title.
			recipeImage.src = recipe.image;
			recipeImage.alt = recipe.title;

			// Add an event listener to the recipe list item
			this.eventClickSave(recipeElement, 'recipeBuild', this.recipeViewOpen.bind(this, recipe));

			// Check if the recipe is a favorite and update the button class

			const isRecipeFavorite = this.isFavorite(recipe.id);
			if (isRecipeFavorite) {
				favoriteButton.textContent = isRecipeFavorite ? '❤️' : '💔';
				favoriteButton.classList.toggle('is-favorite', isRecipeFavorite);
			}

			// Add event listener for the favorite button
			this.eventClickSave(favoriteButton, 'favoriteItemClick', (event) => {
				this.toggleFavorite.bind(this, recipe)(event);
				event.stopPropagation();
			});

			// Return the element
			return recipeElement;
		};

		// Loop through the recipe results and fill the list.
		recipeData.results.forEach(
			recipe => this.elements.searchResults.appendChild(recipeItemBuild(recipe)));
	}

	// Search for recipes
	recipeSearch(event) {
		const searchQuery = this.elements.searchInput.value;
		let searchResult;

		event.preventDefault();

		try {
			// If there's no text in the search box, throw an error.
			if (!this.elements.searchInput.value.length) throw new Error('searchInputEmpty');

			// Get the API URL for Spoonacular, and build the search parameters.
			const url  = this.apis.recipeSearch;
			url.search = new URLSearchParams({
				                                 apiKey: this.data.apiKeys.spoonacular,
				                                 query:  this.elements.searchInput.value
			                                 });

			// Check if this item has already been searched for (to save API calls)
			if (searchResult = this.data.searchHistory.find(item => item.searchQuery === searchQuery)) {
				// Hide landing page container
				this.elements.landingContainer.classList.add('hide');
				this.recipeResultList(searchResult);
			}

			// Fetch the JSON
			else this.apiFetchJSON({
				                       url:      this.apis.recipeSearch,
				                       callback: recipeData => {
					                       // Hide landing page container
					                       this.elements.landingContainer.classList.add('hide');

					                       // Hide landing page container
					                       this.elements.landingContainer.classList.add('hide');

					                       // Save the search history
					                       this.data.searchHistory.push({searchQuery: searchQuery, ...recipeData});
					                       this.apiCacheSave('searchHistory');
					                       this.recipeHistoryList();

					                       // Build the recipe result list.
					                       this.recipeResultList(recipeData);
				                       }
			                       });

		} catch (error) {
			// Log any errors.
			console.log('recipeSearch Error:', this.errors[error.message]);
			return false;
		}
	}

	// Close the recipe view element
	recipeViewClose() {
		// Show search results and hide the recipe card (if visible).
		this.elements.searchResults.classList.remove('hide');
		this.elements.recipeCard.classList.add('hide');

		// Clear the text and lists
		this.elements.recipeTitle.textContent = '';
		this.elements.recipeImage.src         = '';
		[...this.elements.recipeDirectionList.children].forEach(child => child.remove());
		[...this.elements.recipeIngredientList.children].forEach(child => child.remove());
	}

	// Open the recipe view element and populate it.
	recipeViewOpen(recipe) {
		// Function to fill the recipe card
		const recipeFill = (dish) => {
			// Clear the lists
			[...this.elements.recipeDirectionList.children].forEach(child => child.remove());
			[...this.elements.recipeIngredientList.children].forEach(child => child.remove());

			// Hide the search results, show the recipe.
			this.elements.searchResults.classList.add('hide');
			this.elements.recipeCard.classList.remove('hide');
			this.elements.recipeCard.style.display = 'block';

			// Set the title and image
			this.elements.recipeTitle.textContent = dish.title;
			this.elements.recipeImage.src         = dish.image;

			// Ingredients
			dish.recipe.extendedIngredients.forEach(ingredient => {
				// Clone the ingredient list item
				const ingredientElement = this.templates.recipeIngredientItem.cloneNode(true).firstElementChild;

				// Set the text for the ingredient, and add to the list.
				ingredientElement.textContent = ingredient.original;
				this.elements.recipeIngredientList.appendChild(ingredientElement);
			});

			// Directions
			dish.recipe.analyzedInstructions[0].steps.forEach(direction => {
				// Clone the direction list item
				const directionElement = this.templates.recipeDirectionItem.cloneNode(true).firstElementChild;

				// Set the text for the direction, and add to the list.
				directionElement.textContent = direction.step;
				this.elements.recipeDirectionList.appendChild(directionElement);
			});
		};

		try {
			// Get the API URL and fill the path with the request data.
			const url  = new URL(this.apis.recipeInfo);
			url.pathname += `/${recipe.id}/information`;
			url.search = new URLSearchParams({
				                                 apiKey:           this.data.apiKeys.spoonacular,
				                                 includeNutrition: true
			                                 });

			// Check if this item has already been searched for (to save API calls)
			if (recipe.recipe) recipeFill(recipe);

			// Otherwise, request the data from the server.
			else this.apiFetchJSON({
				                       url:      url,
				                       callback: recipeData => {
					                       recipe.recipe = recipeData;

					                       // Save the history and fill the data.
					                       this.apiCacheSave('searchHistory');
					                       recipeFill(recipe);
				                       }
			                       });
		} catch (error) {
			// Log any errors.
			console.log('recipeSearch Error:', this.errors[error.message]);
			return false;

		}
	}
}

// Load the site
const tab = new takeABite();
