'use client'

import { Fragment } from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Menu, Transition } from '@headlessui/react'
import { DownOutlined } from '@ant-design/icons'
import Link from 'next/link'
import classNames from '@/shared/utils/classnames'
import IconFont from '@/app/components/base/iconFont'
import styles from './index.module.scss'

type AdvancedFeaturesNavProps = {
  className?: string
}

/**
 * 高级功能导航组件
 * 提供高级功能的下拉菜单，包含模型库、模型推理、模型微调、工具集
 */
const AdvancedFeaturesNav = ({
  className,
}: AdvancedFeaturesNavProps) => {
  const currentSegment = useSelectedLayoutSegment()
  const isActive = ['modelWarehouse', 'inferenceService', 'modelAdjust', 'tools'].includes(currentSegment || '')

  // 构建按钮样式类名
  const buildButtonClassName = () => classNames(
    className, 'group',
    isActive && 'bg-white',
    isActive ? 'text-primary-600' : 'text-gray-500',
    styles.wrapNav,
  )

  // 菜单项基础样式类
  const menuItemBaseClasses = `
    flex items-center w-full h-9 px-3 text-gray-700 text-[14px]
    rounded-lg font-normal hover:bg-gray-50 cursor-pointer
  `

  // 子菜单项配置
  const menuItems = [
    {
      href: '/modelWarehouse/modelManage',
      icon: 'icon-moxingcangku',
      label: '模型库',
      segment: 'modelWarehouse',
    },
    {
      href: '/inferenceService/platform',
      icon: 'icon-tuilifuwu',
      label: '模型推理',
      segment: 'inferenceService',
    },
    {
      href: '/modelAdjust',
      icon: 'icon-moxingweitiao',
      label: '模型微调',
      segment: 'modelAdjust',
    },
    {
      href: '/tools',
      icon: 'icon-gongju',
      label: '工具集',
      segment: 'tools',
    },
  ]

  // 渲染图标
  const renderIcon = () => (
    <div className={isActive ? styles.activeIcon : styles.normal}>
      <IconFont type='icon-shezhi2' className={'w-4 h-4'} />
    </div>
  )

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className={buildButtonClassName()}>
          {renderIcon()}
          高级功能
          <DownOutlined className="w-2 h-2 ml-1" />
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="transform opacity-0 scale-99"
        enterTo="transform opacity-100 scale-110"
        leave="transition ease-in duration-110"
        leaveFrom="transform opacity-100 scale-110"
        leaveTo="transform opacity-0 scale-99"
      >
        <Menu.Items
          className="
            absolute left-0 mt-1.5 w-48
            origin-top-left rounded-lg bg-white
            shadow-lg z-50
          "
        >
          <div className="px-1 py-1">
            {menuItems.map((item) => {
              const itemIsActive = currentSegment === item.segment
              return (
                <Menu.Item key={item.href}>
                  <Link
                    href={item.href}
                    className={classNames(
                      menuItemBaseClasses,
                      itemIsActive && 'bg-gray-100 text-primary-600',
                    )}
                  >
                    <IconFont type={item.icon} className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                </Menu.Item>
              )
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

export default AdvancedFeaturesNav

