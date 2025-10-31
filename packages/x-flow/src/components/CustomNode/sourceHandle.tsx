import { PlusOutlined } from '@ant-design/icons';
import { Handle } from '@xyflow/react';
import { Tooltip } from 'antd';
import classNames from 'classnames';
import React, { ComponentProps, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NodeSelectPopover from '../NodesPopover';
import { ConfigContext } from '../../models/context';
import './index.less';

export type HandleProps = ComponentProps<typeof Handle>

export default memo((props:Partial<HandleProps> &  Record<string,any> ) => {
  const {
    position,
    isConnectable,
    selected,
    isHovered,
    handleAddNode,
    switchTitle,
    isConnected, // 是否有连接的节点
    nodeType,
    ...rest
  } = props;
  const [isShowTooltip, setIsShowTooltip] = useState(false);
  const [openNodeSelectPopover, setOpenNodeSelectPopover] = useState(false);
  const popoverRef = useRef(null);
  const { antdVersion, globalConfig } = useContext(ConfigContext);
  const handleProps = globalConfig?.handle || {};

  const toolTipVersionProps = useMemo(() => {
    if (antdVersion === 'V5') {
      return {
        open: isShowTooltip,
      };
    }
    // V4
    return {
      visible: isShowTooltip,
    };
  }, [isShowTooltip]);

  return (
    <Handle
      isValidConnection={(edge)=>{
        if(handleProps.isValidConnection){
          return handleProps.isValidConnection(edge,'source',nodeType)
        }
        return true
      }}
      type="source"
      position={position}
      isConnectable={isConnectable}
      onMouseEnter={() => setIsShowTooltip(true)}
      onMouseLeave={() => setIsShowTooltip(false)}
      onClick={e => {
        e.stopPropagation();
        popoverRef?.current?.changeOpen(true);
        setIsShowTooltip(false);
        setOpenNodeSelectPopover(true);
      }}
      {...rest}
      className={classNames(
        {
          'handle-disconnected': !isConnected,
        },
        rest.className
      )}
    >
      {(selected || isHovered || openNodeSelectPopover) && (
        <>
          {switchTitle && (
            <div className="xflow-node-switch-title">{switchTitle}</div>
          )}
          {isConnectable && (
            <div className="xflow-node-add-box">
              <NodeSelectPopover
                placement="right"
                addNode={handleAddNode}
                ref={popoverRef}
                onNodeSelectPopoverChange={val => setOpenNodeSelectPopover(val)}
                nodeType={nodeType}
              >
                <Tooltip
                  title="点击添加节点"
                  //  arrow={false}
                  overlayInnerStyle={{
                    background: '#fff',
                    color: '#354052',
                    fontSize: '12px',
                  }}
                  color="#fff"
                  {...toolTipVersionProps}
                  getPopupContainer={() =>
                    document.getElementById('xflow-container') as HTMLElement
                  }
                >
                  <PlusOutlined style={{ color: '#fff', fontSize: 10 }} />
                </Tooltip>
              </NodeSelectPopover>
            </div>
          )}
        </>
      )}
    </Handle>
  );
});
