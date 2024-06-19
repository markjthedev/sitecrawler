const express = require('express')
const puppeteer = require('puppeteer')
const bodyParser = require('body-parser')
const path = require('path')
const cheerio = require('cheerio')

const app = express()
const port = 3000
app.use('/static', express.static('public'))

console.log(__dirname + '/public')
// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
// app.use(express.static('public'))
// Serve the form page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'))
})

// Handle form submission
app.post('/screenshotsss', async (req, res) => {
  const { url } = req.body

  if (!url) {
    return res.status(400).send('URL is required')
  }

  try {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    console.log('created page', Date().toLocaleString())
    await page.goto(url, { waitUntil: 'load', timeout: 0 })

    const html = await page.content()
    console.log('fetched html', Date().toLocaleString())
    const $ = cheerio.load(html)

    console.log('loaded html', Date().toLocaleString())
    const elements = []
    elements.push(...$('section'))
    elements.push(...$('header'))
    elements.push(...$('footer'))
    elements.push(...$('main'))
    elements.push(...$('div.container'))

    const screenshots = []

    for (const element of elements) {
      const selector =
        $(element).prop('tagName').toLowerCase() + $(element).attr('class')
          ? `[${$(element).prop('tagName').toLowerCase()}${
              $(element).attr('class')
                ? '.' + $(element).attr('class').replace(/\s+/g, '.')
                : ''
            }]`
          : $(element).prop('tagName').toLowerCase()
      let retries = 0
      while (retries < 3) {
        try {
          await page.waitForSelector(selector, { timeout: 30000 })
          const elementHandle = await page.$(selector)
          const screenshotBuffer = await elementHandle.screenshot()
          screenshots.push(
            `data:image/png;base64,${screenshotBuffer.toString('base64')}`
          )
          break
        } catch (error) {
          retries++
          console.log(
            `Retry ${retries}: Waiting for selector ${selector} timed out`
          )
          await new Promise((r) => setTimeout(r, 1000)) // wait for 1 second before retrying
        }
      }
      if (retries === 3) {
        console.log(
          `Failed to capture screenshot for selector ${selector} after 3 retries`
        )
      }
    }

    await browser.close()

    res.render('result', { screenshots })
  } catch (error) {
    console.error(error)
    res.status(500).send('An error occurred while taking the screenshots')
  }
})

app.post('/screenshot', async (req, res) => {
  const url = req.body.url
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 }) // Set viewport to 1920x1080

  await page.goto(url)

  const selectors = ['header', 'footer', 'div.section', 'section']
  const screenshots = []

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 30000 })
      const elements = await page.$$(selector)
      console.log(page)
      for (const element of elements) {
        const screenshotBuffer = await element.screenshot()
        screenshots.push({
          selector,
          screenshot: `data:image/png;base64,${screenshotBuffer.toString(
            'base64'
          )}`,
        })
      }
    } catch (error) {
      console.log(`Error taking screenshot for selector ${selector}: ${error}`)
    }
  }
  console.log(screenshots, { screenshots })
  await browser.close() // Close the browser instance

  res.render('result', { screenshots: screenshots })
})
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
