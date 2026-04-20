'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputOrder = document.getElementById('input--order');

const btnEdit = document.getElementById('edit');
const btnDelete = document.getElementById('delete');
const btnDeleteAll = document.getElementById('delete-all');

const modalError = document.querySelector('.error-popup');
const modalErrorMessage = document.querySelector('.error-popup__message');
const modalBtn = document.querySelector('.error-popup__btn');
const overlay = document.querySelector('.overlay');

class Workout {
  date = new Date();
  id = Date.now();

  constructor(coords, duration, distance) {
    this.coords = coords;
    this.duration = duration;
    this.distance = distance;
  }

  _description() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    return this.description;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, duration, distance, cadence) {
    super(coords, duration, distance);
    this.cadence = cadence;
    this.calcPace();
    this._description();
  }

  calcPace() {
    this.pace = this.distance / this.duration;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, duration, distance, elevationGain) {
    super(coords, duration, distance);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._description();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #setZoomWorkout = 13;
  isEditing = false;
  workoutToEdit = null;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    btnDeleteAll.addEventListener('click', this.reset);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    inputOrder.addEventListener('change', this._orderWorkouts.bind(this));
    modalBtn.addEventListener('click', () => {
      overlay.classList.add('none');
    });
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        // alert("We couldn't get your curret position.");
      });
    }
  }

  _loadMap(position) {
    // Save coords
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // Load map
    this.#map = L.map('map').setView(coords, this.#setZoomWorkout);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Listening to 'click' event on the map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE, workout = null) {
    form.classList.remove('hidden');
    inputDistance.focus();
    if (workout) {
      this.isEditing = true;
      this.workoutToEdit = workout;

      inputType.value = workout.type;
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;

      if (workout.type === 'running') {
        inputCadence.value = workout.cadence;
        inputElevation.closest('.form__row').classList.add('form__row--hidden');
        inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }
      if (workout.type === 'cycling') {
        inputElevation.value = workout.elevationGain;
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }
    } else {
      this.#mapEvent = mapE;
    }
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.classList.add('hidden');
    form.style.display = 'none';
    setTimeout(() => (form.style.display = 'grid'), 1000);

    this.isEditing = false;
    this.workoutToEdit = null;
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Check valid inputs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from user
    const type = inputType.value;
    const duration = +inputDuration.value;
    const distance = +inputDistance.value;
    let workout;

    if (this.isEditing) {
      workout = this.workoutToEdit;
      workout.distance = distance;
      workout.duration = duration;

      if (type === 'running') {
        workout.cadence = +inputCadence.value;
        if (
          !validInputs(distance, duration, workout.cadence) ||
          !allPositive(distance, duration, workout.cadence)
        ) {
          return alert('Please, provide positive numbers.');
        }
        workout.calcPace();
      } else {
        workout.elevationGain = +inputElevation.value;
        if (
          !validInputs(distance, duration, workout.elevationGain) ||
          !allPositive(distance, duration)
        ) {
          return alert('Please, provide positive numbers.');
        }
        workout.calcSpeed();
      }

      this._setLocalStorage();
      location.reload();
    } else {
      const { lat, lng } = this.#mapEvent.latlng;

      // Create a running workout
      if (type === 'running') {
        const cadence = +inputCadence.value;

        if (
          !validInputs(duration, distance, cadence) ||
          !allPositive(duration, distance, cadence)
        ) {
          overlay.classList.remove('none');
          modalErrorMessage.textContent =
            'All inputs must be positive numbers.';
          return;
        }
        workout = new Running([lat, lng], duration, distance, cadence);
      }

      // Create a cycling workout
      if (type === 'cycling') {
        const elevationGain = +inputElevation.value;

        if (
          !validInputs(duration, distance, elevationGain) ||
          !allPositive(duration, distance)
        ) {
          overlay.classList.remove('none');
          modalErrorMessage.textContent =
            'Distance and duration fields must be positive numbers.';
          return;
        }

        workout = new Cycling([lat, lng], duration, distance, elevationGain);
      }

      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Store workouts on localStorage
      this._setLocalStorage();

      // Clear input fields
      this._hideForm();
    }
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }),
      )
      .setPopupContent(
        `${this.type === 'running' ? '🏃‍♀️' : '🚴‍♀️'} ${workout.description}`,
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <div class="workout__info">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="workout__btn" id="edit">Editar</button>
          <button class="workout__btn" id="delete">Eliminar</button>
        </div>
      
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♀️' : '🚴‍♀️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === Number(workoutEl.dataset.id),
    );

    // Verify if is deleting
    if (e.target.id === 'delete') {
      this._deleteWorkout(workout);
      return;
    }

    if (e.target.id === 'edit') {
      this._showForm(null, workout);
      return;
    }

    this.#map.setView(workout.coords, this.#setZoomWorkout, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data.map(work => {
      if (work.type === 'running') {
        const obj = new Running(
          work.coords,
          work.duration,
          work.distance,
          work.cadence,
        );
        obj.id = work.id;
        obj.date = new Date(work.date);
        return obj;
      }

      if (work.type === 'cycling') {
        const obj = new Cycling(
          work.coords,
          work.duration,
          work.distance,
          work.elevationGain,
        );
        obj.id = work.id;
        obj.date = new Date(work.date);
        return obj;
      }
    });

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
    // containerWorkouts.innerHTML = '';
  }

  _deleteWorkout(workout) {
    this.#workouts = this.#workouts.filter(work => work.id !== workout.id);
    this._setLocalStorage();
    location.reload();
  }

  _orderWorkouts() {
    const field = inputOrder.value;

    this.#workouts.sort((a, b) => {
      const valA = a[field] || 0;
      const valB = b[field] || 0;

      return valA - valB;
    });

    // Remove workouts from ul container
    const workoutsEl = document.querySelectorAll('.workout');
    workoutsEl.forEach(work => work.remove());

    // Render workouts again
    this.#workouts.forEach(work => this._renderWorkout(work));
  }
}

const app = new App();
