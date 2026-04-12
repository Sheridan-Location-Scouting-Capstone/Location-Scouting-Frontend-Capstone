import type { NextConfig } from "next";

module.exports = {
    experimental: {
        serverActions: {
            bodySizeLimit: '500mb',
        }
    }
}


const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '500mb',
        }
    }
};

export default nextConfig;
