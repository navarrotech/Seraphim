// Copyright © 2026 Jalapeno Labs

type Props = {
  message?: string
}

export function EmptyData(props: Props) {
  return <section className='text-center w-full p-12'>
    <p className='text-xl'>{
      props.message
    }</p>
  </section>
}
