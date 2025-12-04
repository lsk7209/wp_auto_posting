import axios from 'axios';

interface SiteConfig {
    url: string;
    username: string;
    app_password_b64: string; // Base64 encoded password
}

function getAuthHeader(site: SiteConfig): string {
    try {
        // Decode the stored base64 password to get the raw application password
        const rawPassword = Buffer.from(site.app_password_b64, 'base64').toString('utf-8');
        // Create the Basic Auth token: base64(username:password)
        const token = Buffer.from(`${site.username}:${rawPassword}`).toString('base64');
        return `Basic ${token}`;
    } catch (e) {
        console.error('Error creating auth header:', e);
        // Fallback or re-throw
        return '';
    }
}

export async function upload_media(site: SiteConfig, imageBuffer: Buffer, filename: string = 'image.png'): Promise<number> {
    try {
        const authHeader = getAuthHeader(site);
        const response = await axios.post(`${site.url}/wp-json/wp/v2/media`, imageBuffer, {
            headers: {
                'Authorization': authHeader,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'image/png', // Adjust based on actual image type if possible
            },
            timeout: 20000, // 20 seconds timeout
        });
        return response.data.id;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('WP Upload Media Error:', error.response?.data || error.message);
        } else {
            console.error('WP Upload Media Error:', error);
        }
        throw error;
    }
}

interface PostPayload {
    title: string;
    content: string; // HTML content
    content_html?: string; // specific field from AI
    status: 'publish' | 'draft' | 'future';
    date?: string; // ISO 8601
    categories?: number[];
    featured_media?: number;
}

export async function publish_post(site: SiteConfig, payload: PostPayload): Promise<number> {
    try {
        const authHeader = getAuthHeader(site);

        // Map content_html to content if provided
        const content = payload.content_html || payload.content;

        const response = await axios.post(`${site.url}/wp-json/wp/v2/posts`, {
            title: payload.title,
            content: content,
            status: payload.status,
            date: payload.date,
            categories: payload.categories,
            featured_media: payload.featured_media,
        }, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            timeout: 20000, // 20 seconds timeout
        });
        return response.data.id;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('WP Publish Post Error:', error.response?.data || error.message);
        } else {
            console.error('WP Publish Post Error:', error);
        }
        throw error;
    }
}
