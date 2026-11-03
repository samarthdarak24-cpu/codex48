import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function ThreeOrb({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 320
    const height = container.clientHeight || 320

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.z = 4.2

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Central Icosahedron (Brand Core)
    const geoSphere = new THREE.IcosahedronGeometry(1.4, 2)
    const matWire = new THREE.MeshBasicMaterial({
      color: 0x4e7a3d,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    })
    const meshWire = new THREE.Mesh(geoSphere, matWire)
    scene.add(meshWire)

    // Inner glowing core
    const geoCore = new THREE.IcosahedronGeometry(0.85, 1)
    const matCore = new THREE.MeshBasicMaterial({
      color: 0x2fb86b,
      wireframe: false,
      transparent: true,
      opacity: 0.18,
    })
    const meshCore = new THREE.Mesh(geoCore, matCore)
    scene.add(meshCore)

    // Floating data particles (Nodes representing brand rules & citations)
    const particleCount = 48
    const posArray = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 1.9 + Math.random() * 0.7
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      posArray[i] = radius * Math.sin(phi) * Math.cos(theta)
      posArray[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
      posArray[i + 2] = radius * Math.cos(phi)
    }

    const geoParticles = new THREE.BufferGeometry()
    geoParticles.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    const matParticles = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x5fd48f,
      transparent: true,
      opacity: 0.9,
    })
    const particleSystem = new THREE.Points(geoParticles, matParticles)
    scene.add(particleSystem)

    // Mouse movement interaction
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / width) * 2 - 1
      mouseY = -(((e.clientY - rect.top) / height) * 2 - 1)
    }

    container.addEventListener('mousemove', onMouseMove)

    // Animation Loop
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)

      targetX += (mouseX - targetX) * 0.05
      targetY += (mouseY - targetY) * 0.05

      meshWire.rotation.y += 0.005
      meshWire.rotation.x = targetY * 0.4
      meshWire.rotation.z = targetX * 0.3

      meshCore.rotation.y -= 0.007
      meshCore.rotation.x += 0.004

      particleSystem.rotation.y += 0.003
      particleSystem.rotation.x = -targetY * 0.2

      renderer.render(scene, camera)
    }

    animate()

    // Resize handler
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousemove', onMouseMove)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      geoSphere.dispose()
      matWire.dispose()
      geoCore.dispose()
      matCore.dispose()
      geoParticles.dispose()
      matParticles.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className={className || 'relative h-[320px] w-full flex items-center justify-center overflow-hidden'}
      aria-label="3D Interactive Brand Governance Orb"
    />
  )
}
