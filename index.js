const express = require('express')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')
const path = require('path')
const cheerio = require('cheerio')

const app = express()
const port = 3000
app.use('/static', express.static('public'))
 
app.use(bodyParser.urlencoded({ extended: true }))  

// routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'))
})

app.post('/screenshot', async (req, res) => {
  const url = req.body.url
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  console.log('created page');
  await page.setViewport({ width: 1920, height: 1080 })
  
  await page.goto(url, { timeout: 0 })
  console.log('wentn to url', url);

  const html = await page.content()
  const $ = cheerio.load(html)
  console.log('loaded html in cheerio', $);
  
  const selectors = ['header', 'footer', 'div.section', 'section']
  const screenshots = []

  for (const selector of selectors) {
    try {
      const elements = await page.$$(`${selector}`)
      console.log(`Found ${elements.length} elements for selector ${selector}`);

      for (const element of elements) {
        const screenshotBuffer = await element.screenshot()
        screenshots.push({
          selector,
          screenshot: `data:image/png;base64,${screenshotBuffer.toString('base64')}`,
        })
        console.log('generated image');
      }
    } catch (error) {
      console.log(`Error taking screenshot for selector ${selector}: ${error}`)
    }
  }
  await browser.close()

  res.render('result', { screenshots: screenshots })
})


app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

//server listner
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
