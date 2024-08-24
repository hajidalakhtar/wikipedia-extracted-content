import {Hono} from 'hono'
import {serve} from '@hono/node-server'
import {load} from 'cheerio'

const app = new Hono()

interface ExtractedContent {
    about: string;
    [key: string]: string;
}

function extractContent(htmlContent: string): ExtractedContent {
    const $ = load(htmlContent)
    const result: ExtractedContent = {
        about: ''
    }

    // Extract the content before the first h2 as "about"
    result.about = $('p')
        .first()
        .nextUntil('h2')
        .map((_, el) => $(el).text())
        .get()
        .join('\n\n')

    // Extract content for each h2
    $('h2').each((_, elem) => {
        const key = $(elem)
            .text()
            .toLowerCase()
            .replace(/\s+/g, '_')
        const content = $(elem)
            .nextUntil('h2')
            .map((_, el) => $(el).text())
            .get()
            .join('\n\n')
        result[key] = content
    })

    return result
}

app.get('/:search', async (c) => {
    try {
        const searchParam = c.req.param('search');
        const response = await fetch(`https://id.wikipedia.org/w/api.php?action=query&format=json&titles=${searchParam}&prop=extracts|images|extlinks`)
        const data = await response.json()

        const pages = data.query.pages
        const firstPageKey = Object.keys(pages)[0]
        const htmlContent = pages[firstPageKey].extract

        const extractedContent = extractContent(htmlContent)
        const returnData = {
            "title": pages[firstPageKey].title,
            "content": extractedContent,
            "images": pages[firstPageKey].images,
            "extlinks": pages[firstPageKey].extlinks
        }

        return c.json(returnData)
    } catch (error) {
        console.error('Error:', error)
        return c.json({error: 'An error occurred while processing the request'}, 500)
    }
})

export default app
