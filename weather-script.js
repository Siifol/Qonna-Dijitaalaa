async function getWeather() {
    const city = document.getElementById('cityInput').value;
    const apiKey = 'YOUR_API_KEY_HERE'; // Get this from OpenWeatherMap.org
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;

    const resultDiv = document.getElementById('weatherResult');
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            document.getElementById('cityName').innerText = data.name;
            document.getElementById('temp').innerText = `Temperature: ${data.main.temp}°C`;
            document.getElementById('desc').innerText = `Conditions: ${data.weather[0].description}`;
        } else {
            alert("City not found. Please check the spelling.");
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
    }
}
