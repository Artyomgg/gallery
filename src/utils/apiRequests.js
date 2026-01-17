export async function getData(url) {
	try {
		const res = await fetch(url)
		const data = await res.json()
		return data
	} catch (error) {
		console.error('Ошибка при GET запросе:', error)
	}
}

export async function postData(url, data) {
	try {
		const res = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(data),
			headers: { 'Content-type': 'application/json; charset=UTF-8' },
		})
		return res
	} catch (error) {
		console.error('Ошибка при POST запросе:', error)
	}
}
