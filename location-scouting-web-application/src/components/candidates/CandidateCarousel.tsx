'use client'

import {useState} from "react";
import Lightbox from "yet-another-react-lightbox"
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import "yet-another-react-lightbox/plugins/counter.css";
import {Counter, Inline, Thumbnails} from "yet-another-react-lightbox/plugins";
import {Box, Paper, Typography} from "@mui/material";

type CandidateCarouselProps = {
    photos: { url: string }[]
}

export default function CandidateCarousel({ photos } : CandidateCarouselProps ) {
    const [open, setOpen] = useState(false)
    const [index, setIndex] = useState(0)

    const toggleOpen = (state: boolean) => () => setOpen(state);

    const updateIndex =
        (when: boolean) =>
            ({index: current } : {index: number}) => {
                if (when === open) {
                    setIndex(current)
                }
            };

    return (
        <>
            <Paper
                variant='outlined'
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    '--yarl__color_backdrop': 'transparent',
                    '--yarl__thumbnails_container_background_color': 'transparent',
                    '--yarl__thumbnails_thumbnail_active_border_color': (theme) => theme.palette.primary.main,
                    // Rounded main image
                    '& .yarl__carousel': { borderRadius: 1.5, overflow: 'hidden' },
                    '& .yarl__container': {
                        borderRadius: 1.5,
                        overflow: 'hidden',
                    },
                }}
            >
                {photos.length > 0 ? (<Lightbox
                    index={index}
                    slides= {photos.map(p => ({src: p.url}))}
                    plugins={[Inline, Thumbnails, Counter]}
                    carousel={{
                        padding: 0,
                        spacing: 0,
                        imageFit: 'cover',
                    }}
                    inline={{
                        style: {
                            width: '100%',
                            aspectRatio: '16 / 10',
                        }
                    }}
                    counter={{
                        container: {
                            style: {
                                top: 'unset',
                                left: 'unset',
                                bottom: 12,
                                right: 12,
                                borderRadius: 6,
                                background: 'rgba(0,0,0,0.6)',
                                padding:'2px 8px',
                                fontSize: 12
                            },
                        },
                    }}
                    thumbnails={{
                        position: 'bottom',
                        width: 80,
                        height: 56,
                        border: 2,
                        borderRadius: 6,
                        padding: 0,
                        gap: 12,
                        imageFit: 'cover',
                        vignette: false,
                    }}
                >
                </Lightbox>) : (
                    <Typography
                        color='text.secondary'
                        sx={{ py: 6, textAlign: 'center'}}
                        data-testid='view-candidate-carousel-empty-state-message'
                    >
                        No photos selected for this candidate yet
                    </Typography>
                )}
            </Paper>
        </>
    )


}