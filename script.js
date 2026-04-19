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

const btnEdit = document.getElementById('edit');
const btnDelete = document.getElementById('delete');
const btnDeleteAll = document.getElementById('delete-all');

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

// const running1 = new Running([-34, 56], 30, 6, 20);
// const cycling1 = new Cycling([-34, 56], 54, 12, 64);
// console.log(running1);
// console.log(cycling1);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #setZoomWorkout = 13;
  idEditing = false;
  elEditing;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    // Event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    btnDeleteAll.addEventListener('click', this.reset);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
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

  _showForm(mapE) {
    if (this.isEditing) {
      inputType.disabled = true;
      inputType.value = this.elEditing.type;
    }

    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
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
  }

  _toggleElevationField() {
    const type = this.isEditing ? this.elEditing.type : inputType.value;

    if (type === 'running') {
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
    }
    if (type === 'cycling') {
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
    }

    // inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    // inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Check valid inputs
    const validNumber = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const validPositiveNumber = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from user
    const type = inputType.value;
    const duration = +inputDuration.value;
    const distance = +inputDistance.value;

    if (this.isEditing) {
      const elValues = {
        type,
        duration,
        distance,
      };

      this._editWorkout(elValues);
      this.isEditing = false;

      return;
    }

    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    // Create a running workout
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validNumber(duration, distance, cadence) ||
        !validPositiveNumber(duration, distance, cadence)
      )
        return alert('Please, provide a positive number.');
      workout = new Running([lat, lng], duration, distance, cadence);
    }

    // Create a cycling workout
    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !validNumber(duration, distance, elevationGain) ||
        !validPositiveNumber(duration, distance)
      )
        return alert('Please, provide a positive number.');

      workout = new Cycling([lat, lng], duration, distance, elevationGain);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    e.preventDefault();

    // Render workout on list
    this._renderWorkout(workout);

    // Store workouts on localStorage
    this._setLocalStorage();

    // Clear input fields
    this._hideForm();
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
    console.log(workout);
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
            <span class="workout__value">${workout.cadence.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain.toFixed(1)}</span>
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
    console.log(workout.id);

    // Verify if is deleting
    if (e.target.getAttribute('id') === 'delete') {
      this._deleteWorkout(workoutEl);
      return;
    }

    // Verify if is editing
    if (e.target.getAttribute('id') === 'edit') {
      // this._editWorkout(workoutEl);
      this.isEditing = true;
      this.elEditing = workout;
      this._showForm();
      this._toggleElevationField();
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
    console.log('hola');
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    data.forEach(work => {
      this._renderWorkout(work);
    });
    console.log(data);
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _editWorkout(newValues) {
    let data = JSON.parse(localStorage.getItem('workouts'));

    // Change values workout
    const workoutIndex = data.findIndex(
      work => work.id === Number(this.elEditing.id),
    );
    this.elEditing = { ...this.elEditing, ...newValues };

    data[workoutIndex] = this.elEditing;

    this.#workouts = data;

    this._setLocalStorage();
    console.log(this.elEditing);

    console.log('workout');
  }

  _deleteWorkout(workoutEl) {
    // Get workouts from localStorage
    let data = JSON.parse(localStorage.getItem('workouts'));

    // Filter workouts
    data = data.filter(work => work.id !== Number(workoutEl.dataset.id));

    localStorage.setItem('workouts', JSON.stringify(data));
    console.log(workoutEl);
    console.log(data);

    location.reload();
    // containerWorkouts.innerHTML = '';

    // console.log(this);
    // data.forEach(work => this._renderWorkout(work));
  }
}

const app = new App();
