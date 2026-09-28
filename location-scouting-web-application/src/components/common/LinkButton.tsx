'use client'

import Link from 'next/link'
import { Button, ButtonProps } from '@mui/material'

type LinkButtonProps = Omit<ButtonProps<typeof Link>, 'component'> & { href: string }

/**
 * A MUI Button that navigates with next/link. Renders a single <a>, instead of a <button> nested inside a
 * <Link> (invalid HTML: interactive content inside an anchor). Client component so server pages can use it.
 */
export default function LinkButton(props: LinkButtonProps) {
    return <Button component={Link} {...props} />
}
