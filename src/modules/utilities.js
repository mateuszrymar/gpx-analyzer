import { gsap } from "../../node_modules/gsap/dist/gsap.min.js";
import { INFO } from './info.js';


const UTIL = (function () {
	let performanceList = [];
	let storedStates = [];

	function secondsToMinutesAndSeconds(sec) {
		let result;
		sec = Number(sec);
		let hours = Math.floor(sec / 3600);
		let minutes = Math.floor(sec % 3600 / 60);
		let seconds = Math.floor(sec % 3600 % 60);
		
		if (minutes == 0) {
			minutes = `00`
		} else if (minutes < 10) {
			minutes = `0${minutes}`
		}
		
		if (seconds === 0) {
			seconds = `00`
		} else if (seconds < 10) {
			seconds = `0${seconds}`
		}
		
		result = `${hours}:${minutes}:${seconds}`;
		return result;
	}
	
	function metersToKm(m) {
		let km;
	
		km = (m/1000).toFixed(2);
	
		return km;
	}

	function sumArray(array) {
		const initialValue = 0;
		const sum = array.reduce(
			(accumulator, currentValue) => accumulator + currentValue, initialValue);
		return sum;
	}

	function series (startNumber, endNumber, count) {
		let result = [];
		let step = ( endNumber - startNumber ) / ( count - 1 );

		if (count === 0) {
			return 0;
		} else if (startNumber === endNumber) {
			for ( let x = 0; x < count; x++) {
				let y;
				y = startNumber;
				result.push(y);
			} 
		} else {
			for ( let i = 0; i < count; i++) {
				let y;
				y = startNumber + step * [i];
				result.push(y); 
			}
		}
		return result;
	}

	function smoothArray(array, smoothingCount, rounding) {
		let smoothNumbers = []

		for (let i = 0; i < array.length; i++) {
			let start = parseInt([i]) - parseInt(smoothingCount/2);
			let end = parseInt([i]) + parseInt(smoothingCount/2);
			let numbersToAverage = [];
			const indicesToProcess = series(start, end, smoothingCount);

			for (let n = 0; n < smoothingCount; n++) {
				const index = indicesToProcess[n];	
				let element = parseFloat(array.at(index));
				if (element === undefined) element = 0;
				numbersToAverage.push(element);			
			}
			
			smoothNumbers.push(parseFloat((sumArray(numbersToAverage) / smoothingCount).toFixed(rounding)));		
		}

		return smoothNumbers;
	}	

	function sleep(ms) {
		return new Promise(
			resolve => setTimeout(resolve, ms)
		);
	}
	
	class PerformanceStat {
		constructor(name, value) {
			this.name = name;
			this.value = value;
		}
	
		startTimer() {
			let start = Date.now();
			return start;
		}
	
		endTimer() {
			let end = Date.now();
			return end;
		}
	
		evaluateTimer(performanceStat, startTimer, endTimer) {
			performanceStat.value = endTimer - startTimer;
		}
	
		addStat(stat, unit) {
			performanceList = (`${performanceList}
				<li>${stat.name}: ${stat.value} ${unit}</li>
			`);
		}
	}	
	
	class TrackPoint {
		constructor(id, lat, lon, ele, time) {
			this.id = id;
			this.lat = lat;
			this.lon = lon;
			this.ele = ele;
			this.time = time;
			this.dist = 0;
			this.totDist = 0;
			this.speed = 0;
			this.interval = 0;
			this.eleDiff = 0;
		}		
		distance(lat1, lon1, lat2, lon2) {
			// Haversine formula - 0.3% error expected		
			const R = 6371e3; // metres
			const φ1 = lat1 * Math.PI/180; // φ, λ in radians
			const φ2 = lat2 * Math.PI/180;
			const Δφ = (lat2-lat1) * Math.PI/180;
			const Δλ = (lon2-lon1) * Math.PI/180;
	
			const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
								Math.cos(φ1) * Math.cos(φ2) *
								Math.sin(Δλ/2) * Math.sin(Δλ/2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
			const d = R * c; // in metres
	
			return d;
		}
	
		timeToDate(time) {
			let timeTemplate = /[0-9.]{1,}/g;
			let date;
	
			date = time.match(timeTemplate);
			date = new Date(Date.UTC(date[0], date[1]-1, date[2], date[3], date[4], date[5]));
	
			return date;
		}
		
		speedBetweenPoints(distance, interval) {
			let speed;
	
			if (interval != 0) {
				speed = distance / interval;
			} else {
				speed = 0;
			}
	
			return speed;
		}
	
		elevationDifference(ele1, ele2) {
			let eleDiff = 0;
	
			eleDiff = ele2 - ele1;
	
			return eleDiff;
		}
	}

	const StateManager = (function () {
		let StateManager;

		class State {
			constructor( name, domElements, current ) {
				name = this.name;
				domElements = this.domElements;
				current = this.current;
			}
		}

		class domElement {
			constructor( element, innerHtml, style ) {
				element = this.element;
				innerHtml = this.innerHtml;
				style = this.style;
			}
		}

		function createStateManager() {
			console.log('state manager created.')
			return new Object({name: 'stateManager'});
		}

		function storeDom(stateName, elementsToStore) {
			let elementsArray = [];
			let stateToStore = new State;
			
			
			stateToStore.name = stateName;
			stateToStore.current = true;
			
			let entry = Object.entries(elementsToStore);
			let styleTemplate = /(style=")((.|\n)*?)(")/;
			for ( let i = 0; i < entry.length; i++ ) {
				let currentElement = new domElement;
				
				currentElement.id = entry[i][1].classList[0];				
				currentElement.innerHtml = entry[i][1].innerHTML;
				
				let currentOuterHtml = entry[i][1].outerHTML;
				let currentStyle = currentOuterHtml.match(styleTemplate);
				if (currentStyle !== null) {
					currentStyle = currentStyle[2];
				} else { currentStyle = '' }
				currentElement.style = currentStyle;
				
				elementsArray.push(currentElement);
			};

			stateToStore.domElements = elementsArray;

			storedStates.push(stateToStore);
		}

		function createNewState( newStateName, newElements, newStyles, newInnerHtml ) {

			let baseState = storedStates[0];
			let baseIds = (baseState.domElements).map(
				({ id, innerHtml, style }) => {return id});
	
			let newElementsIds = [];
			for ( let i=0; i<newElements.length; i++) {
				let currentId = newElements[i].classList[0];
				newElementsIds.push(currentId);
			}		
			let newEntries = []
			
			// // THIS LOOP IS PROBABLY WRONG!!!
	
			for ( let i=0; i<baseState.domElements.length; i++ ) {
				let currentEntryId = (baseIds[i]);
				let indexOfNewElement = newElementsIds.indexOf(currentEntryId);
				
				// THE BUG WAS IN THESE CONDITIONAL STATEMENTS:
				if (indexOfNewElement !== -1) {
					let newEntry = new domElement;
					newEntry.id = `${baseState.domElements[i].id}`;				
					if ( newStyles[indexOfNewElement] !== '' ) { 
						newEntry.innerHtml = `${newInnerHtml[indexOfNewElement]}` };
					if ( newStyles[indexOfNewElement] !== '' ) { 
						newEntry.style = `${newStyles[indexOfNewElement]}` };
						
					newEntries.push(newEntry);
				} else {
					let newEntry = new domElement;
					newEntry.id = `${baseState.domElements[i].id}`;
					newEntry.innerHtml = `${baseState.domElements[i].innerHtml}`;
					newEntry.style = `${baseState.domElements[i].style}`;
					newEntries.push(newEntry);
				}			
			} 
			
			let stateToCreate = new State;
			stateToCreate.name = newStateName;
			stateToCreate.current = false;
			stateToCreate.domElements = newEntries;
	
			return storedStates.push(stateToCreate);
		}	

		function checkCurrentState() {
			let currentState;
			for ( let i=0; i< storedStates.length; i++) {
				let current = (storedStates).map(
					({ name, current, domElements }) => {return current});	
				if ( current[i] === true ) {
					currentState = storedStates[i];
				}
			}
			return currentState;
		}

		function setState(newStateName) {
			let oldState = checkCurrentState();
			let baseState = storedStates[0];
			let newState;
			// first we need to check if a State exists with a name === newState
			if ( findStateIndex(newStateName) !== -1 ) {
				console.log('switching from', oldState.name, 'to', newStateName )
				newState = storedStates[findStateIndex(newStateName)];
				switchStates( oldState, baseState );
				switchStates( baseState, newState );
				// now we change all DOM objects.
				newState.domElements.forEach(item => {
					// console.log(document.getElementsByClassName(item.id)[0]);
					document.getElementsByClassName(item.id)[0].setAttribute('style', `${item.style}`);
					// document.getElementsByClassName(item.id)[0].innerHTML = `${item.innerHtml}`;
					// console.log(document.getElementsByClassName(item.id)[0]);
					// document.getElementsByClassName(item.id)[0].innerHTML = `${item.innerHtml}`;
					// document.getElementsByClassName(item.id)[0].style = `${item.style}`;
					// document.getElementsByClassName(item.id)[0].style = `${item.style}`;
				});

			} else throw new Error ('This state has not been specified yet.');

			console.log(newState);
			

		}

		function findStateIndex(stateName) {
			let result;

			let statesArr = (storedStates).map(
				({ name, current, domElements }) => {return name});
			let targetStateIndex = statesArr.indexOf(stateName);
			result = targetStateIndex;

			return result;
		}

		function switchStates( currentState, newState ) {
			if ( findStateIndex(newState.name) !== -1 ) {
				currentState.current = false;
				newState.current = true;
				currentState = newState;
			} else throw new Error ('This state has not been specified yet.');
			
			return currentState;
		}

		return {			
			getStateManager: function () {
				if (!StateManager) {
					StateManager = createStateManager();
				} else {
					return StateManager;
				}
			},

			storeDom,
			createNewState,
			setState,
			findStateIndex


			// changeDomElement(newStateName, elementToChange),
	
		}
	})();

	const ClickManager = (function() {
		window.addEventListener('click', handleClick);

		let listenedElements = [];

		class eventToListenTo {
			constructor ( element, functionToRun ) {
				element = this.element,
				functionToRun = this.functionToRun
			}
		}

		function listenTo( element, functionToRun ) {
			let newListener = new eventToListenTo;
			newListener.element = `${element}`;
			newListener.functionToRun = functionToRun;
			listenedElements.push(newListener);
		}

		function handleClick(event) {

			let clickedElement = event.target.classList[0];
			let keyArray = listenedElements.map(i => i.element);
			let functionArray = listenedElements.map(i => i.functionToRun);

			const found = keyArray.indexOf(clickedElement);
			
			if (found !== -1) {
				const foundFunction = functionArray[found];
				// This runs a function:
				functionArray[found](event);
			}			
		}

		return {			
			listenTo,
		}
	})();

	function pageLoadAnimation() {
		console.log('page load');
		var pageLoadTimeline = gsap.timeline({});

		pageLoadTimeline.fromTo( '.header',{ x: '150%' }, { duration: .8, x: '0', ease: 'power4.out' }, 0);
		pageLoadTimeline.fromTo( '.home', { x: '-150%' }, { duration: .8, x: '0', ease: 'power4.out' }, 0);
		pageLoadTimeline.fromTo( '.home > * > :not(.examples__loadbar) ',
			 { opacity: 0 }, { duration: .4, opacity: 1, ease: 'none', delay: .2, stagger: .05 }, 0);

	}

	function pageReloadAnimation() {
		// TODO: this function may be unnecessary. try to use pageLoad instead.
		console.log('page reload');
		var pageReloadTimeline = gsap.timeline({});

		pageReloadTimeline.to( '.home > * > :not(.examples__loadbar) ', { opacity: 0, delay: -.2 }, 0);
		pageReloadTimeline.fromTo( '.home', { x: '-150%' }, { duration: .8, x: '0', ease: 'power4.out' }, 0);
		pageReloadTimeline.to( '.home > * > :not(.examples__loadbar) ',
			 { duration: .4, opacity: 1, ease: 'none', delay: .2, stagger: .05 }, 0 );
		pageReloadTimeline.to( '.loadbar', { opacity: 0, delay: -2 }, 0 );
		pageReloadTimeline.to( '.loadbar-status', { transform: 'scaleX(0)', delay: -2 }, 0 );
	}

	// This timeline needts to be in global scope, because we may need to kill it if an error occurs:
	var homeLeaveTimeline = gsap.timeline({});

	function homeLeaveAnimation() {
		console.log('home leave');

		//Animation
		homeLeaveTimeline.fromTo( '.home > * > :not(.examples__loadbar) ', 
			{ opacity: 1},
			{ duration: .6, opacity: 0, ease: 'none', delay: -0.2, stagger: .1, }, 0 );
		homeLeaveTimeline.fromTo( '.stats__stats > * > * ',
			{ opacity: 0 },
			{ opacity: 1, delay: -2 }, 0 );
		homeLeaveTimeline.fromTo( '.graph-panel > * > * ',
			{ opacity: 0},
			{ opacity: 1, delay: -2 }, 0 );
		homeLeaveTimeline.fromTo( '.loadbar',
			{ opacity: 0, delay: 0 },
			{ opacity: 1, duration: 0.4, ease: 'power4.out', delay: 0},  );
		homeLeaveTimeline.fromTo( '.loadbar-status',
			{ transform: 'scaleX(0)',},
			{ transform: 'scaleX(1)', ease: 'none', duration: 2.5, delay: 0},  );
	}

	function homeLeaveAnimationError() {
		console.log(homeLeaveTimeline);
		homeLeaveTimeline.pause();
		homeLeaveTimeline.revert();
	}

	function infoLoadAnimation() {
		console.log('info load');
		
			gsap.fromTo( '.info__load-panel', {x: '-600%'}, { duration: .8, x: '0', ease: 'power4.out', delay: .2 });
			gsap.fromTo( '.info__stats-panel',{x: '-150%'}, { duration: .8, x: '0', ease: 'power4.out', delay: .2 });
			gsap.from( '.stats__stats > * > * ', { duration: 1, opacity: 0, ease: 'power4.out', delay: .5, stagger: .1 });
			gsap.from( '.graph-panel > * > * ', { duration: 1, opacity: 0, ease: 'power4.out', delay: .5, stagger: .1 });
	}

	function infoLeaveAnimation() {
		console.log('info leave');
		gsap.to( '.info__load-panel', { duration: .8, x: '600%', ease: 'power4.out', delay: .4 });
		gsap.to( '.info__stats-panel', { duration: .8, x: '150%', ease: 'power4.out', delay: .4 });
		gsap.to( '.graph-panel > * > * ', { duration: .6, opacity: 1, ease: 'none', delay: -0.2, stagger: .05, });
	}

	
	return { 
		secondsToMinutesAndSeconds, 
		metersToKm, 
		sumArray,
		series,
		smoothArray,
		pageLoadAnimation,
		homeLeaveAnimation,
		homeLeaveAnimationError,
		infoLoadAnimation,
		infoLeaveAnimation,
		pageReloadAnimation,
		PerformanceStat,
		TrackPoint,
		performanceList,
		StateManager,
		storedStates,
		ClickManager
	};
})();

export { UTIL };


