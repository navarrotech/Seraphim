// Copyright © 2026 Jalapeno Labs

type Props = {
  message?: string
}

export function EmptyData(props: Props) {
  return <p className='opacity-70'>{
    props.message
  }</p>
}
