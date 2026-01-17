import { getData, postData } from './utils/apiRequests.js'

export class Gallery {
	constructor(containerId, apiUrl) {
		this.container = document.getElementById(containerId)

		if (!this.container) {
			throw new Error(`Элемент с id="${containerId}" не найден`)
		}

		this.apiUrl = apiUrl
		this.images = []
		this.currentImageIndex = 0
		this.init()
	}

	async init() {
		await this.loadImages()
		this.setupEventListeners()
		this.createModal()
	}

	// Создаем модальное окно для просмотра фото
	createModal() {
		const modalHTML = `
			<div id="imageModal" class="modal">
				<span class="modal-close">&times;</span>
				<button class="nav-btn prev-btn">‹</button>
				<button class="nav-btn next-btn">›</button>
				<div class="modal-container">
					<img class="modal-content" id="modalImage">
					<div class="modal-caption">
						<span id="modalCaption"></span>
						<span id="imageCounter" class="image-counter"></span>
					</div>
				</div>
				<div class="modal-controls">
					<button id="downloadBtn" class="download-btn">
						⬇ Скачать
					</button>
				</div>
			</div>
		`

		document.body.insertAdjacentHTML('beforeend', modalHTML)

		const modal = document.getElementById('imageModal')
		const closeBtn = modal.querySelector('.modal-close')
		const prevBtn = modal.querySelector('.prev-btn')
		const nextBtn = modal.querySelector('.next-btn')

		// Закрытие модального окна
		closeBtn.onclick = () => {
			modal.style.display = 'none'
		}

		// Навигация вперед
		nextBtn.onclick = () => {
			this.nextImage()
		}

		// Навигация назад
		prevBtn.onclick = () => {
			this.prevImage()
		}

		// Закрытие при клике вне изображения
		modal.onclick = event => {
			if (
				event.target === modal ||
				event.target.classList.contains('modal-container') ||
				event.target.classList.contains('modal-content')
			) {
				modal.style.display = 'none'
			}
		}

		// Навигация клавишами
		document.addEventListener('keydown', e => {
			if (modal.style.display !== 'block') return

			switch (e.key) {
				case 'Escape':
					modal.style.display = 'none'
					break
				case 'ArrowLeft':
					this.prevImage()
					break
				case 'ArrowRight':
					this.nextImage()
					break
				case ' ':
					e.preventDefault()
					this.nextImage()
					break
			}
		})

		// Свайп на мобильных устройствах
		let touchStartX = 0
		let touchEndX = 0

		modal.addEventListener('touchstart', e => {
			touchStartX = e.changedTouches[0].screenX
		})

		modal.addEventListener('touchend', e => {
			touchEndX = e.changedTouches[0].screenX
			this.handleSwipe()
		})

		// Кнопка скачивания
		const downloadBtn = document.getElementById('downloadBtn')
		downloadBtn.onclick = () => {
			this.downloadImage()
		}
	}

	// Обработка свайпа
	handleSwipe() {
		const swipeThreshold = 50
		const diff = touchStartX - touchEndX

		if (Math.abs(diff) > swipeThreshold) {
			if (diff > 0) {
				this.nextImage() // Свайп влево - следующее
			} else {
				this.prevImage() // Свайп вправо - предыдущее
			}
		}
	}

	// Перейти к следующему изображению
	nextImage() {
		if (this.images.length <= 1) return

		this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length
		this.showCurrentImage()
	}

	// Перейти к предыдущему изображению
	prevImage() {
		if (this.images.length <= 1) return

		this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length
		this.showCurrentImage()
	}

	// Показать текущее изображение
	showCurrentImage() {
		if (this.images.length === 0) return

		const image = this.images[this.currentImageIndex]
		const modalImg = document.getElementById('modalImage')
		const caption = document.getElementById('modalCaption')
		const counter = document.getElementById('imageCounter')

		modalImg.style.opacity = '0'

		setTimeout(() => {
			modalImg.src = image.url
			caption.textContent = image.name || 'Без названия'
			counter.textContent = ` (${this.currentImageIndex + 1}/${this.images.length})`

			// Загружаем изображение чтобы получить его реальные размеры
			const img = new Image()
			img.onload = () => {
				this.adjustImageSize(modalImg, img.width, img.height)
				modalImg.style.opacity = '1'
			}
			img.onerror = () => {
				modalImg.src = 'https://via.placeholder.com/500x300?text=Ошибка+загрузки'
				modalImg.style.opacity = '1'
			}
			img.src = image.url
		}, 200)
	}

	// Скачивание изображения
	downloadImage() {
		if (this.images.length === 0) return

		const currentImage = this.images[this.currentImageIndex]
		const imageUrl = currentImage.url
		const imageName = currentImage.name || 'image'

		// Создаем временную ссылку для скачивания
		const link = document.createElement('a')
		link.href = imageUrl
		link.download = `${imageName.replace(/\s+/g, '_')}.jpg`
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	// Открытие изображения в модальном окне
	openImageModal(imageUrl, imageName) {
		// Находим индекс текущего изображения
		this.currentImageIndex = this.images.findIndex(
			img => img.url === imageUrl && img.name === imageName
		)

		if (this.currentImageIndex === -1) {
			this.currentImageIndex = 0
		}

		const modal = document.getElementById('imageModal')
		modal.style.display = 'block'

		this.showCurrentImage()
	}

	// Подгоняем размер изображения под 70% экрана
	adjustImageSize(imgElement, originalWidth, originalHeight) {
		const windowWidth = window.innerWidth
		const windowHeight = window.innerHeight

		// 70% от размера окна
		const maxWidth = windowWidth * 0.7
		const maxHeight = windowHeight * 0.7

		let width = originalWidth
		let height = originalHeight

		// Если изображение шире, чем 70% экрана
		if (width > maxWidth) {
			height = (height * maxWidth) / width
			width = maxWidth
		}

		// Если изображение выше, чем 70% экрана
		if (height > maxHeight) {
			width = (width * maxHeight) / height
			height = maxHeight
		}

		imgElement.style.width = `${width}px`
		imgElement.style.height = `${height}px`
	}

	// Загрузить изображения
	async loadImages() {
		const data = await getData(this.apiUrl)

		if (Array.isArray(data)) {
			this.images = data
		} else if (data && Array.isArray(data.images)) {
			this.images = data.images
		} else {
			this.images = []
		}

		this.render()
	}

	// Добавить новое изображение
	async addImage(title, url) {
		if (!title || !url) {
			alert('Пожалуйста, заполните все поля')
			return
		}

		const newImage = {
			name: title,
			url: url,
		}

		const response = await postData(this.apiUrl, newImage)

		if (response && response.ok) {
			await this.loadImages()
			this.clearForm()
		} else {
			alert('Ошибка при добавлении изображения')
		}
	}

	// Сортировать по названию
	sortByName() {
		if (this.images.length === 0) return

		this.images.sort((a, b) => {
			const nameA = a.name || ''
			const nameB = b.name || ''
			return nameA.localeCompare(nameB)
		})

		this.render()
	}

	// Перемешать изображения
	shuffle() {
		if (this.images.length === 0) return

		for (let i = this.images.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[this.images[i], this.images[j]] = [this.images[j], this.images[i]]
		}

		this.render()
	}

	// Отобразить галерею
	render() {
		this.container.innerHTML = ''

		if (this.images.length === 0) {
			this.showEmptyMessage()
			return
		}

		this.hideEmptyMessage()

		this.images.forEach((image, index) => {
			const card = this.createImageCard(image, index)
			this.container.appendChild(card)
		})
	}

	// Создать карточку изображения
	createImageCard(image, index) {
		const card = document.createElement('div')
		card.className = 'image-card'

		const img = document.createElement('img')
		img.src = image.url
		img.alt = image.name || 'Изображение'
		img.dataset.index = index

		img.onerror = () => {
			img.src = 'https://via.placeholder.com/250x180?text=Ошибка+загрузки'
		}

		// Клик для открытия в модальном окне
		img.onclick = () => {
			this.currentImageIndex = index
			this.openImageModal(image.url, image.name)
		}

		const title = document.createElement('div')
		title.className = 'title'
		title.textContent = image.name || 'Без названия'

		// Клик по названию тоже открывает изображение
		title.onclick = () => {
			this.currentImageIndex = index
			this.openImageModal(image.url, image.name)
		}

		card.appendChild(img)
		card.appendChild(title)

		return card
	}

	// Очистить форму
	clearForm() {
		const titleInput = document.getElementById('imageTitle')
		const urlInput = document.getElementById('imageUrl')

		if (titleInput) titleInput.value = ''
		if (urlInput) urlInput.value = ''

		if (titleInput) titleInput.focus()
	}

	// Показать сообщение о пустой галерее
	showEmptyMessage() {
		let emptyMsg = document.getElementById('emptyMessage')

		if (!emptyMsg) {
			emptyMsg = document.createElement('div')
			emptyMsg.id = 'emptyMessage'
			emptyMsg.className = 'empty-message'
			emptyMsg.textContent = 'Галерея пуста. Добавьте первое изображение!'

			this.container.parentNode.insertBefore(emptyMsg, this.container.nextSibling)
		}

		emptyMsg.style.display = 'block'
	}

	// Скрыть сообщение о пустой галерее
	hideEmptyMessage() {
		const emptyMsg = document.getElementById('emptyMessage')
		if (emptyMsg) {
			emptyMsg.style.display = 'none'
		}
	}

	// Настроить обработчики событий
	setupEventListeners() {
		const addBtn = document.getElementById('addBtn')
		if (addBtn) {
			addBtn.addEventListener('click', () => {
				const titleInput = document.getElementById('imageTitle')
				const urlInput = document.getElementById('imageUrl')

				const title = titleInput ? titleInput.value.trim() : ''
				const url = urlInput ? urlInput.value.trim() : ''

				this.addImage(title, url)
			})
		}

		const sortBtn = document.getElementById('sortBtn')
		if (sortBtn) {
			sortBtn.addEventListener('click', () => {
				this.sortByName()
			})
		}

		const shuffleBtn = document.getElementById('shuffleBtn')
		if (shuffleBtn) {
			shuffleBtn.addEventListener('click', () => {
				this.shuffle()
			})
		}

		const handleEnter = e => {
			if (e.key === 'Enter') {
				const titleInput = document.getElementById('imageTitle')
				const urlInput = document.getElementById('imageUrl')

				const title = titleInput ? titleInput.value.trim() : ''
				const url = urlInput ? urlInput.value.trim() : ''
				this.addImage(title, url)
			}
		}

		const titleInput = document.getElementById('imageTitle')
		const urlInput = document.getElementById('imageUrl')

		if (titleInput) {
			titleInput.addEventListener('keypress', handleEnter)
		}

		if (urlInput) {
			urlInput.addEventListener('keypress', handleEnter)
		}
	}
}
