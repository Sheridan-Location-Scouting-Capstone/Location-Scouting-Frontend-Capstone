'use client'

import Lightbox from "yet-another-react-lightbox"
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import {useRef, useState} from "react";
import {Button} from "@mui/material";
import {Slideshow as SlideshowIcon} from "@mui/icons-material";
import {Thumbnails, Slideshow, Fullscreen, Captions} from "yet-another-react-lightbox/plugins";

type PresentationModeProps = {
    photos: { url: string; title?: string, description?: string, alt?: string}[]
}

export default function PresentationMode({ photos } : PresentationModeProps) {
    const [open, setOpen] = useState(false)
    const slideshowRef = useRef(null);

    return (
        <>
            <Button
                variant="contained"
                startIcon={ <SlideshowIcon /> }
                onClick={() => setOpen(true) }
                disabled={photos.length === 0}
            >
                Presentation Mode
            </Button>
            <Lightbox
                open={open}
                close={() => setOpen(false)}
                slides={photos.map((p) => ({ src: p.url, title: p.title, description: p.description, alt: p.alt }))}
                plugins={[Thumbnails, Slideshow, Fullscreen, Captions]}
            />
        </>
    )
}
